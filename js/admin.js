// =============================================================================
// Panel administrador: CRUD servicios, gestión de colas en tiempo real,
// escaneo de QR, listado de usuarios y estadísticas con Chart.js.
// =============================================================================
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth.js";
import { toast, fmtTime, statusLabel } from "./utils.js";
import {
  collection, query, where, orderBy, onSnapshot,
  doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const admin = await requireAdmin();
document.getElementById("user-email").textContent =
  (admin.displayName || admin.email) + " · " + admin.role;

// --- Navegación SPA --------------------------------------------------------
const titles = { queues:"Colas", scan:"Escanear QR", services:"Servicios", users:"Usuarios", stats:"Estadísticas" };
const title = document.getElementById("page-title");
function go(tab) {
  document.querySelectorAll(".side-link[data-tab]").forEach(l => l.classList.toggle("active", l.dataset.tab === tab));
  document.querySelectorAll(".sq-page").forEach(p => p.classList.toggle("active", p.dataset.page === tab));
  title.textContent = titles[tab] || "Panel";
  if (tab === "stats") renderStats();
}
document.querySelectorAll("[data-tab]").forEach(t => t.addEventListener("click", () => go(t.dataset.tab)));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));

// =============================================================================
// SERVICES (CRUD)
// =============================================================================
const svcForm  = document.getElementById("service-form");
const svcId    = document.getElementById("svc-id");
const svcName  = document.getElementById("svc-name");
const svcDesc  = document.getElementById("svc-desc");
const svcAvg   = document.getElementById("svc-avg");
const svcActive= document.getElementById("svc-active");
const svcReset = document.getElementById("svc-reset");
const svcTitle = document.getElementById("svc-form-title");
const servicesBody = document.getElementById("services-body");

let allServices = [];

onSnapshot(query(collection(db, "services"), orderBy("createdAt", "desc")), (snap) => {
  allServices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Listado
  if (!allServices.length) {
    servicesBody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-4">Aún no hay servicios.</td></tr>`;
  } else {
    servicesBody.innerHTML = allServices.map(s => `
      <tr>
        <td><strong>${esc(s.name)}</strong><div class="small text-muted">${esc(s.description||"")}</div></td>
        <td>${s.active ? '<span class="sq-badge serving">Sí</span>' : '<span class="sq-badge cancelled">No</span>'}</td>
        <td>${s.avgServiceTime || "—"} min</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-soft me-1" data-edit="${s.id}">Editar</button>
          <button class="btn btn-sm btn-outline-soft" data-del="${s.id}">Eliminar</button>
        </td>
      </tr>`).join("");
  }
  // Selector cola
  const sel = document.getElementById("queue-service");
  const prev = sel.value;
  sel.innerHTML = allServices.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
  if (prev && allServices.some(s => s.id === prev)) sel.value = prev;
  else if (allServices[0]) sel.value = allServices[0].id;
  bindQueueListener(sel.value);
});

svcForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: svcName.value.trim(),
    description: svcDesc.value.trim(),
    avgServiceTime: Number(svcAvg.value) || 5,
    active: svcActive.checked,
  };
  if (!data.name) { toast("Pon un nombre.", "error"); return; }
  try {
    if (svcId.value) {
      await updateDoc(doc(db, "services", svcId.value), data);
      toast("Servicio actualizado.", "success");
    } else {
      await addDoc(collection(db, "services"), { ...data, createdAt: serverTimestamp() });
      toast("Servicio creado.", "success");
    }
    resetSvcForm();
  } catch (err) { console.error(err); toast(err.message || "Error guardando.", "error"); }
});
svcReset.addEventListener("click", resetSvcForm);
function resetSvcForm() {
  svcId.value = ""; svcName.value = ""; svcDesc.value = "";
  svcAvg.value = 5; svcActive.checked = true; svcTitle.textContent = "Nuevo servicio";
}
servicesBody.addEventListener("click", async (e) => {
  const ed = e.target.closest("[data-edit]");
  if (ed) {
    const s = allServices.find(x => x.id === ed.dataset.edit); if (!s) return;
    svcId.value = s.id; svcName.value = s.name || ""; svcDesc.value = s.description || "";
    svcAvg.value = s.avgServiceTime || 5; svcActive.checked = !!s.active;
    svcTitle.textContent = "Editar servicio"; window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const dl = e.target.closest("[data-del]");
  if (dl) {
    if (!confirm("¿Eliminar este servicio? Sus tickets se conservarán.")) return;
    try { await deleteDoc(doc(db, "services", dl.dataset.del)); toast("Servicio eliminado.", "info"); }
    catch (err) { toast(err.message || "Error eliminando.", "error"); }
  }
});

// =============================================================================
// QUEUES (tiempo real)
// =============================================================================
const queueSel = document.getElementById("queue-service");
const queueBody = document.getElementById("queue-body");
const qWaiting = document.getElementById("q-stat-waiting");
const qServing = document.getElementById("q-stat-serving");
const qDone    = document.getElementById("q-stat-done");
const qNext    = document.getElementById("q-stat-next");

let currentService = null;
let unsubQueue = null;
let currentTickets = [];

queueSel.addEventListener("change", () => bindQueueListener(queueSel.value));

function bindQueueListener(serviceId) {
  if (unsubQueue) { unsubQueue(); unsubQueue = null; }
  currentService = serviceId;
  if (!serviceId) {
    queueBody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-4">Selecciona un servicio…</td></tr>`;
    return;
  }
  unsubQueue = onSnapshot(
    query(collection(db, "tickets"), where("serviceId", "==", serviceId), orderBy("createdAt", "desc")),
    (snap) => {
      currentTickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderQueueTable();
    },
    (err) => { console.error(err); toast("Error cargando la cola.", "error"); }
  );
}

function renderQueueTable() {
  const today = new Date(); today.setHours(0,0,0,0);
  const waiting = currentTickets.filter(t => t.status === "waiting").sort((a,b) => a.number - b.number);
  const serving = currentTickets.filter(t => t.status === "serving");
  const doneToday = currentTickets.filter(t => t.status === "done" && t.completedAt?.toDate && t.completedAt.toDate() >= today);

  qWaiting.textContent = waiting.length;
  qServing.textContent = serving.length;
  qDone.textContent = doneToday.length;
  qNext.textContent = waiting[0] ? `#${waiting[0].number}` : "—";

  const active = [...serving, ...waiting].sort((a,b) => a.number - b.number);
  const rest = currentTickets.filter(t => t.status === "done" || t.status === "cancelled").slice(0, 20);
  const rows = [...active, ...rest];

  if (!rows.length) {
    queueBody.innerHTML = `<tr><td colspan="6" class="text-muted text-center py-4">Sin actividad en esta cola.</td></tr>`;
    return;
  }
  queueBody.innerHTML = rows.map(t => `
    <tr>
      <td><strong>#${t.number}</strong></td>
      <td>${esc(t.userEmail || t.userId)}</td>
      <td><span class="sq-badge ${t.status}">${statusLabel(t.status)}</span></td>
      <td>${fmtTime(t.createdAt)}</td>
      <td>${fmtTime(t.calledAt)}</td>
      <td class="text-end">
        ${t.status === "waiting" ? `<button class="btn btn-sm btn-primary me-1" data-call="${t.id}">Llamar</button>` : ""}
        ${t.status === "serving" ? `<button class="btn btn-sm btn-primary me-1" data-done="${t.id}">Atendido</button>` : ""}
        ${(t.status === "waiting" || t.status === "serving") ? `<button class="btn btn-sm btn-outline-soft" data-cancel="${t.id}">Cancelar</button>` : ""}
      </td>
    </tr>`).join("");
}

queueBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-call],button[data-done],button[data-cancel]");
  if (!btn) return;
  try {
    if (btn.dataset.call)   await updateDoc(doc(db, "tickets", btn.dataset.call),   { status: "serving",   calledAt: serverTimestamp() });
    if (btn.dataset.done)   await updateDoc(doc(db, "tickets", btn.dataset.done),   { status: "done",      completedAt: serverTimestamp() });
    if (btn.dataset.cancel) await updateDoc(doc(db, "tickets", btn.dataset.cancel), { status: "cancelled", completedAt: serverTimestamp() });
  } catch (err) { toast(err.message || "Error en la operación.", "error"); }
});

document.getElementById("btn-call-next").addEventListener("click", async () => {
  const waiting = currentTickets.filter(t => t.status === "waiting").sort((a,b) => a.number - b.number);
  if (!waiting[0]) { toast("No hay nadie esperando.", "info"); return; }
  try {
    await updateDoc(doc(db, "tickets", waiting[0].id), { status: "serving", calledAt: serverTimestamp() });
    toast(`Llamado turno #${waiting[0].number}`, "success");
  } catch (err) { toast(err.message, "error"); }
});
document.getElementById("btn-complete-current").addEventListener("click", async () => {
  const serving = currentTickets.filter(t => t.status === "serving");
  if (!serving.length) { toast("No hay nadie siendo atendido.", "info"); return; }
  try {
    for (const t of serving) {
      await updateDoc(doc(db, "tickets", t.id), { status: "done", completedAt: serverTimestamp() });
    }
    toast("Marcado como atendido.", "success");
  } catch (err) { toast(err.message, "error"); }
});

// =============================================================================
// SCAN QR - VERSIÓN AVANZADA
// =============================================================================
let html5QrScanner = null;
const scanResult = document.getElementById("scan-result");
const videoContainer = document.getElementById("qr-reader");

async function startScanner() {
    if (html5QrScanner) return;

    html5QrScanner = new Html5Qrcode("qr-reader");

    const config = { fps: 15, qrbox: { width: 280, height: 280 } };

    try {
        await html5QrScanner.start(
            { facingMode: "environment" },
            config,
            onScanSuccess
        );
        document.getElementById("btn-scan-start").style.display = "none";
        document.getElementById("btn-scan-stop").style.display = "inline-block";
        toast("Cámara iniciada. Apunta al QR.", "info");
    } catch (err) {
        toast("Error al iniciar cámara: " + err, "error");
    }
}

async function stopScanner() {
    if (!html5QrScanner) return;
    try {
        await html5QrScanner.stop();
        html5QrScanner.clear();
    } catch (e) {}
    html5QrScanner = null;
    document.getElementById("btn-scan-start").style.display = "inline-block";
    document.getElementById("btn-scan-stop").style.display = "none";
}

async function onScanSuccess(decodedText) {
    stopScanner(); // Detener después de leer

    let payload;
    try {
        payload = JSON.parse(decodedText);
    } catch {
        scanResult.innerHTML = `<div class="alert alert-danger">QR no válido (formato incorrecto)</div>`;
        return;
    }

    if (!payload?.t) {
        scanResult.innerHTML = `<div class="alert alert-danger">QR sin información de turno</div>`;
        return;
    }

    try {
        const ticketRef = doc(db, "tickets", payload.t);
        const snap = await getDoc(ticketRef);

        if (!snap.exists()) {
            scanResult.innerHTML = `<div class="alert alert-danger">Turno no encontrado</div>`;
            return;
        }

        const t = snap.data();
        scanResult.innerHTML = `
            <div class="alert alert-success">
                <strong>#${t.number}</strong> - ${esc(t.serviceName || "Servicio")}<br>
                <small>Usuario: ${esc(t.userEmail || t.userId)}</small><br>
                <span class="sq-badge ${t.status}">${statusLabel(t.status)}</span>
            </div>
            <div class="d-grid gap-2 mt-3">
                <button class="btn btn-success" onclick="callScannedTicket('${payload.t}')">Llamar Turno</button>
                <button class="btn btn-primary" onclick="completeScannedTicket('${payload.t}')">Marcar como Atendido</button>
            </div>
        `;
    } catch (err) {
        scanResult.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

// Funciones globales para botones
window.callScannedTicket = async (ticketId) => {
    await updateDoc(doc(db, "tickets", ticketId), { 
        status: "serving", 
        calledAt: serverTimestamp() 
    });
    toast("Turno llamado correctamente", "success");
};

window.completeScannedTicket = async (ticketId) => {
    await updateDoc(doc(db, "tickets", ticketId), { 
        status: "done", 
        completedAt: serverTimestamp() 
    });
    toast("Turno marcado como atendido", "success");
    scanResult.innerHTML = `<div class="alert alert-info">Operación completada.</div>`;
};

// Botones
document.getElementById("btn-scan-start").addEventListener("click", startScanner);
document.getElementById("btn-scan-stop").addEventListener("click", stopScanner);

// =============================================================================
// USERS
// =============================================================================
const usersBody = document.getElementById("users-body");
onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
  if (snap.empty) { usersBody.innerHTML = `<tr><td colspan="4" class="text-muted text-center py-4">Sin usuarios.</td></tr>`; return; }
  usersBody.innerHTML = snap.docs.map(d => {
    const u = d.data();
    return `<tr>
      <td>${esc(u.email)}</td>
      <td>${esc(u.displayName || "—")}</td>
      <td><span class="sq-badge ${u.role === "admin" ? "serving" : "waiting"}">${esc(u.role || "user")}</span></td>
      <td>${fmtTime(u.createdAt)}</td>
    </tr>`;
  }).join("");
}, (err) => { console.error(err); toast("No se pueden cargar los usuarios.", "error"); });

// =============================================================================
// STATS (Chart.js)
// =============================================================================
let chartDaily, chartService;
async function renderStats() {
  try {
    const snap = await getDocs(collection(db, "tickets"));
    const tickets = snap.docs.map(d => d.data());
    document.getElementById("s-total").textContent = tickets.length;
    const done = tickets.filter(t => t.status === "done");
    document.getElementById("s-done").textContent = done.length;
    document.getElementById("s-cancelled").textContent = tickets.filter(t => t.status === "cancelled").length;

    // Tiempo medio espera (llamado - creado) para atendidos
    const diffs = done
      .map(t => (t.calledAt && t.createdAt) ? (t.calledAt.toDate() - t.createdAt.toDate()) : null)
      .filter(Boolean);
    if (diffs.length) {
      const avgMin = Math.round((diffs.reduce((a,b)=>a+b,0) / diffs.length) / 60000);
      document.getElementById("s-avg").textContent = `${avgMin} min`;
    } else document.getElementById("s-avg").textContent = "—";

    // Tickets por día últimos 14
    const days = []; const counts = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      days.push(d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" }));
      counts.push(tickets.filter(t => {
        const c = t.createdAt?.toDate?.(); return c && c >= d && c < next;
      }).length);
    }
    if (chartDaily) chartDaily.destroy();
    /* global Chart */
    chartDaily = new Chart(document.getElementById("chart-daily"), {
      type: "line",
      data: { labels: days, datasets: [{
        label: "Tickets", data: counts,
        borderColor: "#635bff", backgroundColor: "rgba(99,91,255,.15)",
        fill: true, tension: .35, pointRadius: 3,
      }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, precision: 0 } } },
    });

    // Por servicio
    const byService = {};
    tickets.forEach(t => { byService[t.serviceName||"—"] = (byService[t.serviceName||"—"]||0) + 1; });
    const sLabels = Object.keys(byService); const sData = Object.values(byService);
    if (chartService) chartService.destroy();
    chartService = new Chart(document.getElementById("chart-service"), {
      type: "doughnut",
      data: { labels: sLabels, datasets: [{
        data: sData,
        backgroundColor: ["#635bff","#8b5cf6","#ec4899","#0ea5e9","#10b981","#f59e0b","#ef4444"],
      }] },
      options: { plugins: { legend: { position: "bottom" } } },
    });
  } catch (err) { console.error(err); toast("Error cargando estadísticas.", "error"); }
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