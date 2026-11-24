// =========================================================
// DATOS DEL GRADUADO APLICADOS A LA PÁGINA
// Los datos se editan en el bloque GRADUADO al inicio de index.html.
// El nombre también se puede cambiar con ?nombre=... en la URL.
// =========================================================
const params = new URLSearchParams(location.search);
const nombre = (params.get("nombre") || GRADUADO.nombre).trim();
const femenino = /^f/i.test(GRADUADO.genero);
// elige la forma según el género: segunGenero("conciliador", "conciliadora")
const segunGenero = (masculino, femenina) => femenino ? femenina : masculino;

if (!/^(masculino|femenino)$/i.test(GRADUADO.genero))
  console.warn(`GRADUADO.genero debe ser "masculino" o "femenino" (es "${GRADUADO.genero}").`);
if (!document.querySelector('meta[property="og:title"]').content.includes(GRADUADO.nombre))
  console.warn("og:title en index.html no tiene el nombre del graduado: al compartir el enlace se verá otro nombre.");

document.title = `Felicitaciones, ${nombre} · Corporación PESV`;
document.querySelectorAll("[data-name]").forEach(el => el.textContent = nombre);
// <span data-g="graduado|graduada"></span>
document.querySelectorAll("[data-g]").forEach(el => el.textContent = segunGenero(...el.dataset.g.split("|")));
document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());

document.querySelectorAll(".portrait img").forEach(img =>
  img.alt = `${nombre} con toga, birrete y estola, sosteniendo su diploma`);
document.getElementById("diplomaImg").alt =
  `Diploma de ${segunGenero("Conciliador", "Conciliadora")} Extrajudicial en Derecho otorgado a ${nombre} por el Centro de Conciliación y Arbitraje Corporación PESV`;
