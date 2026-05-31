import { auth, db } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, parseAuthError } from "./utils.js";

const form = document.getElementById("login-form");
const btn = document.getElementById("submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) { toast("Completa todos los campos.", "error"); return; }

  btn.disabled = true; btn.textContent = "Entrando...";
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    let role = "user";
    try {
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      if (snap.exists()) role = snap.data().role || "user";
    } catch {}
    toast("Bienvenido 👋", "success");
    setTimeout(() => { location.href = role === "admin" ? "admin.html" : "dashboard.html"; }, 400);
  } catch (err) {
    toast(parseAuthError(err), "error");
    btn.disabled = false; btn.textContent = "Iniciar sesión";
  }
});