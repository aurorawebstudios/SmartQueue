import { auth, db } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, parseAuthError } from "./utils.js";

const form = document.getElementById("register-form");
const btn = document.getElementById("submit");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  if (name.length < 2 || !email || password.length < 6) {
    toast("Revisa los campos del formulario.", "error"); return;
  }
  btn.disabled = true; btn.textContent = "Creando cuenta...";
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, "users", cred.user.uid), {
      email, displayName: name, role: "user", createdAt: serverTimestamp(),
    });
    toast("¡Cuenta creada! 🎉", "success");
    setTimeout(() => { location.href = "dashboard.html"; }, 500);
  } catch (err) {
    toast(parseAuthError(err), "error");
    btn.disabled = false; btn.textContent = "Crear cuenta";
  }
});