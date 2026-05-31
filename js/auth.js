// Guard de sesión + helpers de rol.
import { auth, db } from "./firebase-init.js";
import {
  onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function watchAuth(onUser) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return onUser(null);
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      const profile = snap.exists() ? snap.data() : { role: "user" };
      onUser({ uid: user.uid, email: user.email, ...profile });
    } catch (e) {
      console.error(e);
      onUser({ uid: user.uid, email: user.email, role: "user" });
    }
  });
}

export function requireAuth(redirect = "login.html") {
  return new Promise((resolve) => {
    const off = watchAuth((u) => {
      off();
      if (!u) { location.href = redirect; return; }
      resolve(u);
    });
  });
}

export function requireAdmin(redirect = "dashboard.html") {
  return new Promise((resolve) => {
    const off = watchAuth((u) => {
      off();
      if (!u) { location.href = "login.html"; return; }
      if (u.role !== "admin") { location.href = redirect; return; }
      resolve(u);
    });
  });
}

export async function logout() {
  await signOut(auth);
  location.href = "index.html";
}

// Auto-bind logout buttons.
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-logout]");
  if (b) { e.preventDefault(); logout(); }
});