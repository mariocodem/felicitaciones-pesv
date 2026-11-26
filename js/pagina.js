// =========================================================
// DIPLOMA: imagen, marcador de posición y ampliación
// =========================================================
const img = document.getElementById("diplomaImg");
const placeholder = document.getElementById("placeholder");
const lightbox = document.getElementById("lightbox");

function showPlaceholder() { img.style.display = "none"; placeholder.classList.add("show"); }
img.addEventListener("error", showPlaceholder);
if (img.complete && !img.naturalWidth) showPlaceholder();

document.getElementById("diplomaFile").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  img.src = URL.createObjectURL(file);
  img.style.display = "block";
  placeholder.classList.remove("show");
});

// ampliación a pantalla completa del diploma y de la foto
function ampliar(fuente) {
  const big = lightbox.querySelector("img");
  big.src = fuente.src; big.alt = fuente.alt;
  lightbox.classList.add("open");
}
img.addEventListener("click", () => ampliar(img));
document.getElementById("heroPhoto").addEventListener("click", e => ampliar(e.currentTarget.querySelector("img")));
lightbox.addEventListener("click", () => lightbox.classList.remove("open"));

// =========================================================
// RECUERDOS: nombre del archivo al descargar y su peso
// =========================================================
document.querySelectorAll("[data-descarga]").forEach(a => {
  a.download = `${a.dataset.descarga} - ${nombre}.${a.pathname.split(".").pop()}`;
  fetch(a.href, { method: "HEAD" }).then(r => {
    if (!r.ok) { a.hidden = true; return; }   // si falta el archivo (p. ej. el video sin grabar), no se ofrece
    const b = +r.headers.get("content-length");
    if (b) a.querySelector("[data-peso]").textContent =
      " · " + (b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1).replace(".", ",") + " MB");
  }).catch(() => {});
});

// =========================================================
// ANIMACIONES AL HACER SCROLL
// =========================================================
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("visible");
    if (e.target.id === "diplomaFrame") setTimeout(() => launchConfetti(120), 700);
    io.unobserve(e.target);
  });
}, { threshold: 0.2 });
document.querySelectorAll("section .reveal, #diplomaFrame").forEach(el => io.observe(el));

// brillo que sigue al cursor en las tarjetas
document.querySelectorAll(".value").forEach(card => card.addEventListener("pointermove", e => {
  const r = card.getBoundingClientRect();
  card.style.setProperty("--mx", `${e.clientX - r.left}px`);
  card.style.setProperty("--my", `${e.clientY - r.top}px`);
}));

// =========================================================
// MENSAJES (se guardan en este navegador)
// =========================================================
// cada graduado tiene su propio muro: la clave sale del nombre ("felicitaciones-pesv-alirio-hernando-…")
const KEY = "felicitaciones-pesv-" + nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const list = document.getElementById("messages");
const iniciales = [
  { name: "Corporación PESV", text: `Nos enorgullece contar con ${segunGenero("un nuevo conciliador comprometido", "una nueva conciliadora comprometida")} con la cultura de paz. ¡Muchos éxitos!` },
  { name: "Familia", text: "Estamos muy orgullosos de ti. ¡Este es solo el comienzo de un gran camino!" }
];
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const save = m => { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {} };
function render() {
  list.innerHTML = "";
  [...load().reverse(), ...iniciales].forEach(m => {
    const card = document.createElement("div"); card.className = "msg";
    const p = document.createElement("p"); p.textContent = `“${m.text}”`;
    const s = document.createElement("span"); s.textContent = `— ${m.name}`;
    card.append(p, s); list.append(card);
  });
}
document.getElementById("msgForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = document.getElementById("msgName").value.trim(), text = document.getElementById("msgText").value.trim();
  if (!name || !text) return;
  const msgs = load(); msgs.push({ name, text }); save(msgs);
  e.target.reset(); render(); launchConfetti(90);
});
render();
