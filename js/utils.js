// Helpers genéricos: toasts, fechas, parser de errores Firebase.

export function toast(msg, type = "info", timeout = 3500) {
  let wrap = document.querySelector(".sq-toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "sq-toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = `sq-toast ${type}`;
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateY(8px)"; }, timeout - 200);
  setTimeout(() => el.remove(), timeout);
}

export function fmtTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString();
}

export function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString();
}

export function parseAuthError(err) {
  const code = (err && err.code) || "";
  const map = {
    "auth/invalid-email": "El email no es válido.",
    "auth/missing-password": "Introduce una contraseña.",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
    "auth/email-already-in-use": "Ese email ya está registrado.",
    "auth/user-not-found": "No existe ninguna cuenta con ese email.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/invalid-credential": "Credenciales no válidas.",
    "auth/too-many-requests": "Demasiados intentos. Inténtalo más tarde.",
    "auth/network-request-failed": "Sin conexión con el servidor.",
  };
  return map[code] || (err && err.message) || "Ha ocurrido un error.";
}

export function statusLabel(s) {
  return {
    waiting: "En espera",
    serving: "Atendiendo",
    done: "Atendido",
    cancelled: "Cancelado",
  }[s] || s;
}

export function debounce(fn, ms = 300) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}