import { auth, db } from "/js/firebase-init.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, parseAuthError, isValidPassword, isValidRealName } from "./utils.js";

const form = document.getElementById("register-form");
const btn = document.getElementById("submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;

  // === VALIDACIONES ===
  if (!isValidRealName(name)) {
    toast("Por favor, introduce un nombre real (ej: Juan Pérez)", "error");
    return;
  }

  if (!isValidPassword(password)) {
    toast("La contraseña debe tener: mínimo 6 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo especial.", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Creando cuenta...";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    await updateProfile(cred.user, { displayName: name });
    
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      displayName: name,
      role: "user",
      createdAt: serverTimestamp(),
      emailVerified: false
    });

    await sendEmailVerification(cred.user);

    toast(
      "¡Cuenta creada! Revisa tu correo y haz clic en el enlace de verificación antes de iniciar sesión.",
      "success",
      6000
    );

    setTimeout(() => {
      location.href = "login.html";
    }, 3500);

  } catch (err) {
    toast(parseAuthError(err), "error");
    btn.disabled = false;
    btn.textContent = "Crear cuenta";
  }
});