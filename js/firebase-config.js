// js/firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyBlV2jQBstYWe0XTZLDbTY8XyVP-1xY0RE",
  authDomain: "smartqueue-2026.firebaseapp.com",
  projectId: "smartqueue-2026",
  storageBucket: "smartqueue-2026.firebasestorage.app",
  messagingSenderId: "619380541977",
  appId: "1:619380541977:web:d68416942a02c04d8db888"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Hacer db disponible globalmente
const db = firebase.firestore();
window.db = db;

console.log("✅ Firebase inicializado correctamente en index.html");