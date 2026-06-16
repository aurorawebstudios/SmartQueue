// Modo claro/oscuro en localStorage.
const KEY = "sq-theme";

export function getTheme() {
  return localStorage.getItem(KEY)
    || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
export function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(KEY, t);
  document.querySelectorAll("[data-theme-icon]").forEach(el => {
    el.textContent = t === "dark" ? "☀️" : "🌙";
  });
}
export function toggleTheme() {
  applyTheme(getTheme() === "dark" ? "light" : "dark");
}


applyTheme(getTheme());

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-theme-toggle]");
  if (btn) { e.preventDefault(); toggleTheme(); }
});