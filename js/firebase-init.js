import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlV2jQBstYWe0XTZLDbTY8XyVP-1xY0RE",
  authDomain: "smartqueue-2026.firebaseapp.com",
  projectId: "smartqueue-2026",
  storageBucket: "smartqueue-2026.firebasestorage.app",
  messagingSenderId: "619380541977",
  appId: "1:619380541977:web:d68416942a02c04d8db888"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);