// js/dashboard.js
let currentTickets = [];

async function loadUserTickets() {
    if (!window.currentUser) return;

    const ticketsContainer = document.getElementById('ticketsList');
    const noTickets = document.getElementById('noTickets');

    try {
        const snapshot = await db.collection('tickets')
            .where('userId', '==', window.currentUser.uid)
            .where('status', 'in', ['waiting', 'calling'])
            .orderBy('createdAt', 'desc')
            .get();

        currentTickets = [];
        ticketsContainer.innerHTML = '';

        if (snapshot.empty) {
            noTickets.style.display = 'block';
            return;
        }

        noTickets.style.display = 'none';

        snapshot.forEach(doc => {
            const ticket = { id: doc.id, ...doc.data() };
            currentTickets.push(ticket);
            renderTicketCard(ticket);
        });

    } catch (error) {
        console.error("Error cargando tickets:", error);
    }
}

function renderTicketCard(ticket) {
    const container = document.getElementById('ticketsList');
    
    const html = `
        <div class="col-12 mb-3">
            <div class="card border-secondary bg-dark">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 class="mb-1 text-primary">${ticket.ticketNumber}</h4>
                            <p class="mb-1">${ticket.serviceName || 'Servicio'}</p>
                            <small class="text-muted">
                                ${new Date(ticket.createdAt?.toDate()).toLocaleString('es-ES')}
                            </small>
                        </div>
                        <div class="text-end">
                            <span class="badge bg-success fs-6">${ticket.status === 'calling' ? '¡Te están llamando!' : 'En espera'}</span>
                            <button onclick="showQR('${ticket.id}')" class="btn btn-outline-light btn-sm mt-2 w-100">
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
    const services = await getActiveServices();
    
    if (services.length === 0) {
        alert("No hay servicios disponibles en este momento.");
        return;
    }

    // Por ahora tomamos el primer servicio (puedes mejorar con un modal selector)
    const service = services[0];

    const ticketNumber = generateTicketNumber(service.name);

    try {
        await db.collection('tickets').add({
            ticketNumber: ticketNumber,
            userId: window.currentUser.uid,
            serviceId: service.id,
            serviceName: service.name,
            status: 'waiting',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            position: await getNextPosition(service.id)
        });

        alert(`¡Turno solicitado! Número: ${ticketNumber}`);
        loadUserTickets();
    } catch (error) {
        alert("Error al solicitar turno: " + error.message);
    }
}

function generateTicketNumber(serviceName) {
    const prefix = serviceName.substring(0, 1).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
}

async function getActiveServices() {
    const snapshot = await db.collection('services').where('isActive', '==', true).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getNextPosition(serviceId) {
    const snapshot = await db.collection('tickets')
        .where('serviceId', '==', serviceId)
        .where('status', '==', 'waiting')
        .get();
    return snapshot.size + 1;
}

async function showQR(ticketId) {
    const ticket = currentTickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const modal = new bootstrap.Modal(document.getElementById('qrModal'));
    
    document.getElementById('modalTicketNumber').textContent = ticket.ticketNumber;
    document.getElementById('modalServiceName').textContent = ticket.serviceName;

    // Generar QR
    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: JSON.stringify({
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            userId: ticket.userId
        }),
        width: 256,
        height: 256,
        colorDark: "#ffffff",
        colorLight: "#1a1a1a"
    });

    modal.show();
}

function printQR() {
    window.print();
}

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    loadUserTickets();
    
    // Actualización en tiempo real
    if (window.currentUser) {
        db.collection('tickets')
            .where('userId', '==', window.currentUser.uid)
            .onSnapshot(() => {
                loadUserTickets();
            });
    }
});
