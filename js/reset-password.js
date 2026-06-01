import { auth } from "./firebase-init.js";
import { confirmPasswordReset } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { toast, parseAuthError, isValidPassword } from "./utils.js";

const form = document.getElementById("reset-form");
const btn = document.getElementById("submit-btn");
const urlParams = new URLSearchParams(window.location.search);
const oobCode = urlParams.get("oobCode");

if (!oobCode) {
  toast("Enlace inválido o expirado", "error");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newPassword = document.getElementById("new-password").value;

  if (!isValidPassword(newPassword)) {
    toast("La contraseña no cumple los requisitos de seguridad", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Guardando...";

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    toast("¡Contraseña actualizada correctamente!", "success");
    setTimeout(() => location.href = "login.html", 2000);
  } catch (err) {
    toast(parseAuthError(err), "error");
    btn.disabled = false;
    btn.textContent = "Guardar Nueva Contraseña";
  }
});