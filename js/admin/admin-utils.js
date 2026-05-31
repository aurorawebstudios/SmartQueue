// admin/js/admin-utils.js
async function loadAdminDashboard() {
    await Promise.all([
        loadWaitingTicketsCount(),
        loadAttendedToday(),
        loadActiveServices(),
        loadTotalUsers(),
        loadActiveTickets()
    ]);
}

async function loadWaitingTicketsCount() {
    const snapshot = await db.collection('tickets')
        .where('status', '==', 'waiting')
        .get();
    document.getElementById('waitingCount').textContent = snapshot.size;
}

async function loadAttendedToday() {
    // Simplificado - en producción filtra por fecha
    const snapshot = await db.collection('tickets')
        .where('status', '==', 'attended')
        .get();
    document.getElementById('attendedToday').textContent = snapshot.size;
}

async function loadActiveServices() {
    const snapshot = await db.collection('services')
        .where('isActive', '==', true)
        .get();
    document.getElementById('activeServices').textContent = snapshot.size;
}

async function loadTotalUsers() {
    const snapshot = await db.collection('users').get();
    document.getElementById('totalUsers').textContent = snapshot.size;
}

async function loadActiveTickets() {
    const container = document.getElementById('adminTicketsList');
    container.innerHTML = '<div class="text-center py-4">Cargando turnos...</div>';

    const snapshot = await db.collection('tickets')
        .where('status', 'in', ['waiting', 'calling'])
        .orderBy('createdAt', 'asc')
        .get();

    let html = '';

    if (snapshot.empty) {
        html = `<p class="text-muted text-center py-4">No hay turnos activos</p>`;
    } else {
        snapshot.forEach(doc => {
            const t = doc.data();
            html += `
                <div class="d-flex justify-content-between align-items-center border-bottom border-secondary py-3">
                    <div>
                        <strong>${t.ticketNumber}</strong> - ${t.serviceName}
                        <small class="text-muted d-block">${t.userEmail || 'Usuario'}</small>
                    </div>
                    <div>
                        <button onclick="callTicket('${doc.id}')" class="btn btn-success btn-sm me-2">Llamar</button>
                        <button onclick="markAsAttended('${doc.id}')" class="btn btn-primary btn-sm">Atendido</button>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = html;
}

async function callTicket(ticketId) {
    await db.collection('tickets').doc(ticketId).update({
        status: 'calling',
        calledAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    loadActiveTickets();
}

async function markAsAttended(ticketId) {
    await db.collection('tickets').doc(ticketId).update({
        status: 'attended',
        attendedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    loadActiveTickets();
    loadAdminDashboard();
}

function refreshAdminData() {
    loadAdminDashboard();
}
