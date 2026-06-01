// =============================================================================
// Dashboard de usuario: turnos activos, posición en cola (tiempo real), QR,
// historial y solicitud de nuevos turnos.
// =============================================================================
import { db } from "./firebase-init.js";
import { requireAuth } from "./auth.js";
import { toast, fmtTime, statusLabel } from "./utils.js";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, doc, runTransaction, serverTimestamp,
  updateDoc, getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const user = await requireAuth();
if (user.role === "admin") {
  document.getElementById("admin-menu-link").style.display = "flex";
}
document.getElementById("user-email").textContent =
  user.displayName || user.email;
if (user.role === "admin") {
  // Cómodo: si el admin entra aquí, le ofrecemos su panel.
  // Pero no forzamos.
}

// --- Navegación por pestañas (SPA simple) ----------------------------------
const tabs = document.querySelectorAll("[data-tab]");
const pages = document.querySelectorAll(".sq-page");
const title = document.getElementById("page-title");
const titles = { home: "Inicio", new: "Pedir turno", history: "Historial" };
function go(tab) {
  document.querySelectorAll(".side-link[data-tab]").forEach(l =>
    l.classList.toggle("active", l.dataset.tab === tab));
  pages.forEach(p => p.classList.toggle("active", p.dataset.page === tab));
  title.textContent = titles[tab] || "Panel";
}
tabs.forEach(t => t.addEventListener("click", () => go(t.dataset.tab)));

// --- Servicios disponibles --------------------------------------------------
const servicesList = document.getElementById("services-list");
onSnapshot(
  query(collection(db, "services"), where("active", "==", true)),
  (snap) => {
    if (snap.empty) {
      servicesList.innerHTML = `<div class="col-12 text-muted">No hay servicios disponibles ahora mismo.</div>`;
      return;
    }
    servicesList.innerHTML = "";
    snap.forEach((d) => {
      const s = d.data();
      const col = document.createElement("div");
      col.className = "col-md-6 col-lg-4";
      col.innerHTML = `
        <div class="sq-feature h-100 d-flex flex-column">
          <div class="ico">🎫</div>
          <h5>${escapeHtml(s.name || "Servicio")}</h5>
          <p>${escapeHtml(s.description || "—")}</p>
          <button class="btn btn-primary mt-3" data-take="${d.id}" data-name="${escapeHtml(s.name||"")}">
            Pedir turno
          </button>
        </div>`;
      servicesList.appendChild(col);
    });
  },
  (err) => { console.error(err); toast("No se pudieron cargar los servicios.", "error"); }
);

servicesList.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-take]");
  if (!btn) return;
  btn.disabled = true; btn.textContent = "Generando...";
  try {
    await takeTicket(btn.dataset.take, btn.dataset.name);
    toast("Turno creado correctamente.", "success");
    go("home");
  } catch (err) {
    console.error(err); toast(err.message || "No se pudo crear el turno.", "error");
  } finally { btn.disabled = false; btn.textContent = "Pedir turno"; }
});

async function takeTicket(serviceId, serviceName) {
  // Evita duplicados activos en el mismo servicio.
  const existing = await getDocs(query(
    collection(db, "tickets"),
    where("userId", "==", user.uid),
    where("serviceId", "==", serviceId),
    where("status", "in", ["waiting", "serving"]),
  ));
  if (!existing.empty) throw new Error("Ya tienes un turno activo en este servicio.");

  // Incrementa el contador atómicamente para asignar el número.
  const number = await runTransaction(db, async (tx) => {
    const ref = doc(db, "counters", serviceId);
    const snap = await tx.get(ref);
    const last = snap.exists() ? (snap.data().lastNumber || 0) : 0;
    const next = last + 1;
    tx.set(ref, { lastNumber: next }, { merge: true });
    return next;
  });

  await addDoc(collection(db, "tickets"), {
    userId: user.uid,
    userEmail: user.email,
    serviceId,
    serviceName,
    number,
    status: "waiting",
    createdAt: serverTimestamp(),
    calledAt: null,
    completedAt: null,
  });
}

// --- Turnos del usuario (tiempo real) --------------------------------------
const activeArea = document.getElementById("active-ticket-area");
const historyBody = document.getElementById("history-body");
const statActive = document.getElementById("stat-active");
const statDone = document.getElementById("stat-done");
const statCancelled = document.getElementById("stat-cancelled");

let notifiedTickets = new Set();

function playNotificationSound() {
  const audio = new Audio("sounds/notification.mp3");
  audio.play();
}

let allTickets = [];

onSnapshot(
  query(
    collection(db, "tickets"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc"),
  ),
  (snap) => {
    allTickets = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  allTickets.forEach(ticket => {

    if (
      ticket.status === "serving" &&
      !notifiedTickets.has(ticket.id)
    ) {

      notifiedTickets.add(ticket.id);

      playNotificationSound();

      alert(
        `🔔 ¡Es tu turno!\n\nNúmero: #${ticket.number}`
      );
    }
  });

  renderStats();
  renderHistory();
  renderActive();
},
  (err) => { console.error(err); toast("Error cargando tus turnos.", "error"); }
);

function renderStats() {
  statActive.textContent = allTickets.filter(t => t.status === "waiting" || t.status === "serving").length;
  statDone.textContent = allTickets.filter(t => t.status === "done").length;
  statCancelled.textContent = allTickets.filter(t => t.status === "cancelled").length;
}

function renderHistory() {
  if (!allTickets.length) {
    historyBody.innerHTML = `<tr><td colspan="5" class="text-muted text-center py-4">Sin turnos todavía.</td></tr>`;
    return;
  }
  historyBody.innerHTML = allTickets.map(t => `
    <tr>
      <td>${escapeHtml(t.serviceName || "—")}</td>
      <td><strong>#${t.number}</strong></td>
      <td><span class="sq-badge ${t.status}">${statusLabel(t.status)}</span></td>
      <td>${fmtTime(t.createdAt)}</td>
      <td>${fmtTime(t.completedAt)}</td>
    </tr>`).join("");
}

// Caches de posición en cola por servicio (para no abrir 1 listener por ticket).
const queueCache = new Map();   // serviceId -> array de tickets activos ordenados
const queueSubs  = new Map();   // serviceId -> unsubscribe

function ensureQueueListener(serviceId, onUpdate) {
  if (queueSubs.has(serviceId)) {
    onUpdate(queueCache.get(serviceId) || []);
    return;
  }
  const unsub = onSnapshot(
    query(
      collection(db, "tickets"),
      where("serviceId", "==", serviceId),
      where("status", "in", ["waiting", "serving"]),
      orderBy("number", "asc"),
    ),
    (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      queueCache.set(serviceId, arr);
      onUpdate(arr);
    },
    (err) => console.error(err),
  );
  queueSubs.set(serviceId, unsub);
}

function renderActive() {
  const active = allTickets.filter(t => t.status === "waiting" || t.status === "serving");
  if (!active.length) {
    activeArea.innerHTML = `<p class="text-muted mb-0">No tienes ningún turno activo. <a href="#" data-tab="new">Pide uno</a>.</p>`;
    return;
  }
  activeArea.innerHTML = active.map(t => `
    <div class="row g-4 align-items-stretch mb-3" data-ticket="${t.id}">
      <div class="col-md-6">
        <div class="sq-ticket h-100">
          <div class="meta">${escapeHtml(t.serviceName || "Servicio")}</div>
          <div class="num">#${t.number}</div>
          <div class="meta">Estado: <span class="sq-badge ${t.status}">${statusLabel(t.status)}</span></div>
          <div class="meta mt-2" data-pos>Calculando posición…</div>
          <div class="d-flex gap-2 justify-content-center mt-3">
            <button class="btn btn-outline-soft btn-sm" data-cancel="${t.id}">Cancelar turno</button>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="sq-card p-4 h-100 text-center">
          <div class="text-muted small mb-2">Muestra este QR en mostrador</div>
          <div class="sq-qr-wrap" data-qr></div>
          <div class="text-muted small mt-2">ID: ${t.id.slice(0,8)}</div>
        </div>
      </div>
    </div>`).join("");

  active.forEach(t => {
    const root = activeArea.querySelector(`[data-ticket="${t.id}"]`);
    if (!root) return;
    // QR
    const qrEl = root.querySelector("[data-qr]");
    qrEl.innerHTML = "";
    /* global QRCode */
    new QRCode(qrEl, {
      text: JSON.stringify({ t: t.id, s: t.serviceId, n: t.number }),
      width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M,
    });
    // Posición
    ensureQueueListener(t.serviceId, (arr) => {
      const idx = arr.findIndex(x => x.id === t.id);
      const posEl = root.querySelector("[data-pos]");
      if (!posEl) return;
      if (t.status === "serving") posEl.textContent = "Te están atendiendo ahora";
      else if (idx < 0) posEl.textContent = "Tu turno ya no está en cola";
      else {
        const ahead = arr.slice(0, idx).filter(x => x.status !== "serving").length;
        posEl.innerHTML = `Posición <strong>${idx + 1}</strong> · ${ahead} delante de ti`;
      }
    });
  });
}

activeArea.addEventListener("click", async (e) => {
  const a = e.target.closest("[data-tab]");
  if (a) { e.preventDefault(); go(a.dataset.tab); return; }
  const c = e.target.closest("[data-cancel]");
  if (c) {
    if (!confirm("¿Cancelar este turno?")) return;
    try {
      await updateDoc(doc(db, "tickets", c.dataset.cancel), {
        status: "cancelled", completedAt: serverTimestamp(),
      });
      toast("Turno cancelado.", "info");
    } catch (err) { toast(err.message || "Error al cancelar.", "error"); }
  }
});

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, m =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
// === ABRIR PERFIL DESDE EL BOTÓN DE ENGARANAJE ===
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-settings-toggle]")) {
    window.location.href = "dashboard/profile.html";   // Para dashboard
    // Si estás en admin.html usa: "dashboard/profile.html"
  }
});

// ====================== MENÚ MÓVIL ROBUSTO ======================
function initMobileMenu() {
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.sq-side');
  
  if (!mobileBtn || !sidebar) return;

  mobileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('open');
  });

  // Cerrar al tocar fuera
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992) {
      if (!e.target.closest('.sq-side') && !e.target.closest('#mobile-menu-btn')) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Cerrar al hacer clic en un enlace del menú (móvil)
  document.querySelectorAll('.side-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 992) {
        sidebar.classList.remove('open');
      }
    });
  });
}

// Inicializar cuando cargue el DOM
document.addEventListener('DOMContentLoaded', initMobileMenu);