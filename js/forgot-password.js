import { auth } from "./firebase-init.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { toast, parseAuthError } from "./utils.js";

const form = document.getElementById("forgot-form");
const btn = document.getElementById("submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = form.email.value.trim();
  if (!email) { toast("Introduce tu email.", "error"); return; }
  btn.disabled = true; btn.textContent = "Enviando...";
  try {
    await sendPasswordResetEmail(auth, email);
    toast("Revisa tu correo para el enlace de recuperación.", "success", 5000);
    btn.textContent = "Enviado ✓";
  } catch (err) {
    toast(parseAuthError(err), "error");
    btn.disabled = false; btn.textContent = "Enviar enlace";
  }
});