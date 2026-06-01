import { auth, db } from "../js/firebase-init.js";
import { updateProfile, updateEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast } from "./utils.js";

const user = await requireAuth(); // Reutiliza tu función de auth

document.getElementById("profile-name").textContent = user.displayName || "Sin nombre";
document.getElementById("profile-email").textContent = user.email;
document.getElementById("profile-role").textContent = user.role || "user";

// Cargar fecha de creación
const userDoc = await getDoc(doc(db, "users", user.uid));
if (userDoc.exists()) {
  const data = userDoc.data();
  document.getElementById("profile-created").textContent = data.createdAt?.toDate?.().toLocaleDateString() || "—";
}

// Cambiar nombre
document.getElementById("btn-change-name").addEventListener("click", async () => {
  const newName = prompt("Nuevo nombre:");
  if (!newName || newName.length < 3) return;
  
  try {
    await updateProfile(auth.currentUser, { displayName: newName });
    await updateDoc(doc(db, "users", user.uid), { displayName: newName });
    toast("Nombre actualizado correctamente", "success");
    location.reload();
  } catch (e) { toast("Error al actualizar nombre", "error"); }
});