// js/qr-generator.js
// Librería QRCode.js ya incluida vía CDN en los HTML

function generateTicketQR(ticket) {
    const qrContainer = document.createElement('div');
    qrContainer.id = `qr-${ticket.id}`;
    
    const qrData = {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        serviceName: ticket.serviceName,
        userId: ticket.userId,
        createdAt: ticket.createdAt ? ticket.createdAt.toDate().toISOString() : new Date().toISOString()
    };

    // Generar QR
    new QRCode(qrContainer, {
        text: JSON.stringify(qrData),
        width: 280,
        height: 280,
        colorDark: "#0d6efd",      // Color azul primario
        colorLight: "#1a1a1a",
        correctLevel: QRCode.CorrectLevel.H
    });

    return qrContainer;
}

// Función para descargar QR como imagen
function downloadQR(ticketId) {
    const canvas = document.querySelector(`#qr-${ticketId} canvas`);
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `ticket-${ticketId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
