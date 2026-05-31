// js/firebase-config.js
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "smartqueue-2026.firebaseapp.com",
    projectId: "smartqueue-2026",
    storageBucket: "smartqueue-2026.firebasestorage.app",
    messagingSenderId: "XXXXXXXXXXXX",
    appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXXXXXX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Exportar para usar en otros archivos
window.auth = auth;
window.db = db;
window.storage = storage;
