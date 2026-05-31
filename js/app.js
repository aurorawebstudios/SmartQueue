import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Verificar autenticación global
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Usuario autenticado:", user.email);
        // Aquí se manejará la protección de rutas en cada página
    }
});

// Modo Oscuro / Claro
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
}

initTheme();

console.log("%cSmartQueue cargado correctamente - v1.0", "color: #6366f1; font-weight: bold");
