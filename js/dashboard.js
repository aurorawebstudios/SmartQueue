// js/dashboard.js - Versión mejorada
let currentTickets = [];

async function loadUserTickets() {
    if (!window.currentUser) return;

    const ticketsContainer = document.getElementById('ticketsList');
    const noTickets = document.getElementById('noTickets');

    try {
        const snapshot = await db.collection('tickets')
            .where('userId', '==', window.currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();

        currentTickets = [];
        ticketsContainer.innerHTML = '';

        let activeTickets = 0;

        snapshot.forEach(doc => {
            const ticket = { id: doc.id, ...doc.data() };
            currentTickets.push(ticket);
            
            if (ticket.status === 'waiting' || ticket.status === 'calling') {
                activeTickets++;
                renderTicketCard(ticket);
            }
        });

        if (activeTickets === 0) {
            noTickets.style.display = 'block';
        } else {
            noTickets.style.display = 'none';
        }

    } catch (error) {
        console.error("Error cargando tickets:", error);
    }
}

function renderTicketCard(ticket) {
    const container = document.getElementById('ticketsList');
    const statusClass = ticket.status === 'calling' ? 'bg-warning text-dark' : 'bg-success';
    const statusText = ticket.status === 'calling' ? '¡Te están llamando!' : 'En espera';

    const html = `
        <div class="col-12 mb-3">
            <div class="card border-secondary bg-dark">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <h4 class="mb-1 text-primary fw-bold">${ticket.ticketNumber}</h4>
                            <p class="mb-2">${ticket.serviceName || 'Servicio General'}</p>
                            <small class="text-muted">
                                Solicitado: ${ticket.createdAt ? new Date(ticket.createdAt.toDate()).toLocaleString('es-ES') : 'Ahora'}
                            </small>
                        </div>
                        
                        <div class="text-end">
                            <span class="badge ${statusClass} fs-6 mb-2">${statusText}</span>
                            <br>
                            <button onclick="showQRModal('${ticket.id}')" class="btn btn-outline-primary btn-sm">
                                <i class="fas fa-qrcode"></i> Ver QR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML += html;
}

async function solicitarNuevoTurno() {
    try {
        // Obtener servicios activos
        const servicesSnapshot = await db.collection('services')
            .where('isActive', '==', true)
            .get();

        if (servicesSnapshot.empty) {
            alert("No hay servicios disponibles en este momento.");
            return;
        }

        // Seleccionar el primer servicio activo (puedes mejorar esto con un modal)
        const serviceDoc = servicesSnapshot.docs[0];
        const service = { id: serviceDoc.id, ...serviceDoc.data() };

        const ticketNumber = `Q${Math.floor(1000 + Math.random() * 9000)}`;

        await db.collection('tickets').add({
            ticketNumber: ticketNumber,
            userId: window.currentUser.uid,
            serviceId: service.id,
            serviceName: service.name,
            status: 'waiting',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            position: await calculatePosition(service.id)
        });

        alert(`✅ Turno solicitado correctamente!\n\nNúmero: ${ticketNumber}`);
        loadUserTickets();

    } catch (error) {
        console.error(error);
        alert("Error al solicitar turno: " + error.message);
    }
}

async function calculatePosition(serviceId) {
    const snapshot = await db.collection('tickets')
        .where('serviceId', '==', serviceId)
        .where('status', '==', 'waiting')
        .get();
    return snapshot.size + 1;
}

async function showQRModal(ticketId) {
    const ticket = currentTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const modal = new bootstrap.Modal(document.getElementById('qrModal'));
    
    document.getElementById('modalTicketNumber').textContent = ticket.ticketNumber;
    document.getElementById('modalServiceName').textContent = ticket.serviceName || 'Servicio';

    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    
    new QRCode(qrContainer, {
        text: JSON.stringify({
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            service: ticket.serviceName
        }),
        width: 260,
        height: 260,
        colorDark: "#ffffff",
        colorLight: "#212529"
    });

    modal.show();
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadUserTickets();

    // Listener en tiempo real
    if (window.currentUser) {
        db.collection('tickets')
            .where('userId', '==', window.currentUser.uid)
            .onSnapshot(loadUserTickets);
    }
});
