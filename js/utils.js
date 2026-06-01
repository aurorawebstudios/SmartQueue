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
// ESTO SON LAS FUNCIONES DE VALIDACIÓN

export function isValidPassword(password) {
  if (password.length < 6) return false;
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasUpper && hasLower && hasNumber && hasSpecial;
}

export function isValidRealName(name) {
  if (name.length < 3) return false;
  
  // Permite letras (incluyendo acentos), espacios y algunos caracteres comunes
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s']{3,}$/;
  if (!nameRegex.test(name)) return false;
  
  // Evitar nombres demasiado repetitivos o aleatorios
  const uniqueChars = new Set(name.toLowerCase().replace(/\s/g, '')).size;
  if (uniqueChars < 4) return false; // Evita "aaa aaa" o "xyz xyz"
  
  return true;
}