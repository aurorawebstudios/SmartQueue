// =============================================
// FIREBASE CONFIGURATION - SMARTQUEUE
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ================== CONFIGURACIÓN ==================
// Reemplaza estos valores con los tuyos desde Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "smartqueue-XXXXX.firebaseapp.com",
    projectId: "smartqueue-XXXXX",
    storageBucket: "smartqueue-XXXXX.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:XXXXXXXXXXXXXXXXXXXXXX"
};

// ================== INICIALIZACIÓN ==================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };

// Utility para obtener usuario actual
export const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user);
        }, reject);
    });
};
