import { auth, db } from "../js/firebase-init.js";
import { 
  updateProfile, 
  updateEmail, 
  deleteUser 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { requireAuth } from "./auth.js";
import { toast } from "./utils.js";

const user = await requireAuth();

document.getElementById("profile-name").textContent = user.displayName || "Sin nombre";
document.getElementById("profile-email").textContent = user.email;
document.getElementById("profile-role").textContent = user.role === "admin" ? "Administrador" : "Usuario";

// Cargar fecha de registro
const userDoc = await getDoc(doc(db, "users", user.uid));
if (userDoc.exists()) {
  const data = userDoc.data();
  if (data.photoURL) {
  const avatarImg = document.getElementById("profile-avatar");
  avatarImg.src = data.photoURL;
  avatarImg.style.padding = "0px";
}
  const createdDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
  document.getElementById("profile-created").textContent = 
    createdDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ====================== CAMBIAR NOMBRE ======================
document.getElementById("btn-change-name").addEventListener("click", async () => {
  const newName = prompt("Introduce tu nuevo nombre completo:");
  if (!newName || newName.trim().length < 3) {
    return toast("El nombre debe tener al menos 3 caracteres", "error");
  }

  try {
    await updateProfile(auth.currentUser, { displayName: newName.trim() });
    await updateDoc(doc(db, "users", user.uid), { displayName: newName.trim() });
    toast("✅ Nombre actualizado correctamente", "success");
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    toast("Error al actualizar nombre", "error");
  }
});

// ====================== CAMBIAR EMAIL ======================
document.getElementById("btn-change-email").addEventListener("click", async () => {
  const newEmail = prompt("Introduce tu nuevo correo electrónico:");
  if (!newEmail || !newEmail.includes("@")) {
    return toast("Por favor introduce un correo válido", "error");
  }

  try {
    await updateEmail(auth.currentUser, newEmail);
    await updateDoc(doc(db, "users", user.uid), { email: newEmail });
    
    toast("✅ Email actualizado correctamente", "success");
    setTimeout(() => location.reload(), 1800);
  } catch (err) {
    if (err.code === "auth/requires-recent-login") {
      toast("Por seguridad, cierra sesión e inicia sesión nuevamente antes de cambiar el email.", "error");
    } else {
      toast("Error al cambiar email: " + (err.message || "Inténtalo más tarde"), "error");
    }
  }
});

// ====================== ELIMINAR CUENTA ======================
document.getElementById("btn-delete-account").addEventListener("click", async () => {
  if (!confirm("⚠️ Esta acción es IRREVERSIBLE. ¿Estás completamente seguro?")) return;

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    await setDoc(doc(db, "verificationCodes", user.uid), {
      code: code,
      email: user.email,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    toast(`✅ Código generado: ${code} (mira la consola)`, "success");
    console.log(`🔑 CÓDIGO DE VERIFICACIÓN: ${code}`);

    const enteredCode = prompt("Introduce el código de 6 dígitos:");

    if (!enteredCode || enteredCode.length !== 6) {
      return toast("Código inválido", "error");
    }

    const codeDoc = await getDoc(doc(db, "verificationCodes", user.uid));
    if (!codeDoc.exists()) return toast("Código expirado", "error");

    const data = codeDoc.data();
    if (data.code !== enteredCode) return toast("Código incorrecto", "error");
    if (new Date() > data.expiresAt.toDate()) return toast("El código ha expirado", "error");

    if (!confirm("¿Confirmas la eliminación DEFINITIVA de tu cuenta?")) return;

    await deleteDoc(doc(db, "users", user.uid));
    await deleteUser(auth.currentUser);

    toast("✅ Cuenta eliminada correctamente", "success");
    setTimeout(() => location.href = "index.html", 1500);

  } catch (err) {
    console.error(err);
    toast("Error durante la eliminación: " + (err.message || ""), "error");
  }
});

// ====================== FOTO DE PERFIL ACTUALIZACIÓN PAL TEACHER ======================
  const avatarContainer = document.getElementById('avatar-container');
  const avatarImg = document.getElementById('profile-avatar');
  const avatarInput = document.getElementById('avatar-upload');


  // Click en el contenedor
  avatarContainer.addEventListener("click", () => {
  new bootstrap.Modal(document.getElementById("avatarModal")).show();
});

  function viewFullPhoto() {
    
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;`;
    modal.innerHTML = `<img src="${avatarImg.src}" style="max-width:92%;max-height:92%;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.8);">`;
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
  }

  document.getElementById("btn-view-photo").addEventListener("click", () => {
  viewFullPhoto();
});

document.getElementById("btn-change-photo").addEventListener("click", () => {

  bootstrap.Modal.getInstance(
    document.getElementById("avatarModal")
  ).hide();

  setTimeout(() => {
    avatarInput.click();
  }, 200);

});

document.getElementById("btn-delete-photo").addEventListener("click", () => {
  deleteProfilePhoto();
});

  // Subir foto
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 3*1024*1024) {
      return toast("La imagen no debe superar los 3MB", "error");
    }

    const reader = new FileReader();
    reader.onload = async function(ev) {
      avatarImg.src = ev.target.result;
      avatarImg.style.padding = "0px";

      await updateProfile(auth.currentUser, { photoURL: ev.target.result });
      await updateDoc(doc(db, "users", user.uid), { photoURL: ev.target.result });

      toast("✅ Foto de perfil actualizada", "success");
    };
    reader.readAsDataURL(file);

    });
  // Eliminar foto
  async function deleteProfilePhoto() {
    if (!confirm("¿Eliminar tu foto de perfil?")) return;

    avatarImg.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    avatarImg.style.padding = "35px";
    avatarInput.value = "";

    try {
      await updateProfile(auth.currentUser, { photoURL: null });
      await updateDoc(doc(db, "users", user.uid), { photoURL: null });
      toast("✅ Foto eliminada correctamente", "success");
    } catch (err) {
      toast("Error al eliminar la foto", "error");
    }
  }