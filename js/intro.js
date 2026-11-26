// =========================================================
// INTRO TIPO VIDEO
// Cada .scene de #film en index.html se reproduce en orden y declara:
//   data-duration="7500"  duración en ms
//   data-lights, data-flash, data-fireworks, data-confetti, data-caps  efectos
// La música (musica.js) sigue el reloj de la película: cambiar duraciones
// mueve el punto en que la canción coincide con la revelación.
// =========================================================
const film = document.getElementById("film");
const scenes = [...film.querySelectorAll(".scene")];
const progress = document.getElementById("progress");
const btnPause = document.getElementById("btnPause");
const btnMute = document.getElementById("btnMute");
scenes.forEach(() => progress.insertAdjacentHTML("beforeend", "<span><i></i></span>"));
const bars = [...progress.querySelectorAll("i")];
// segundo de la película en que empieza cada escena
const sceneStart = scenes.map((_, i) => scenes.slice(0, i).reduce((t, s) => t + +s.dataset.duration, 0) / 1000);

let idx = -1, elapsed = 0, last = 0, paused = false, rafId = null;

function replay(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

function showScene(i) {
  scenes.forEach((s, k) => {
    s.classList.remove("leaving");
    if (k === idx && k !== i) { s.classList.add("leaving"); setTimeout(() => s.classList.remove("active", "leaving"), 900); }
    else if (k !== i) s.classList.remove("active");
  });
  idx = i; elapsed = 0;
  // reinicia animaciones CSS de la escena
  const s = scenes[i];
  s.style.setProperty("--dur", s.dataset.duration + "ms");
  s.classList.remove("active"); void s.offsetWidth; s.classList.add("active");
  bars.forEach((b, k) => b.style.width = k < i ? "100%" : "0%");
  film.classList.toggle("lights", s.hasAttribute("data-lights"));
  if (i > 0) replay(document.getElementById("streak"), "go");
  if (s.hasAttribute("data-flash")) replay(document.getElementById("flash"), "go");
  Sound.sync(sceneStart[i]);
  if (s.hasAttribute("data-fireworks")) launchFireworks(8, 5500);
  if (s.hasAttribute("data-confetti")) setTimeout(() => launchConfetti(260), 1900);
  if (s.hasAttribute("data-caps")) setTimeout(() => launchCaps(16), 2600);
}

// =========================================================
// POLVO DORADO (fondo de la intro)
// =========================================================
const dCanvas = document.getElementById("dust");
const dCtx = dCanvas.getContext("2d");
let motes = [], dustOn = false;
function initDust() {
  sizeCanvas(dCanvas);
  motes = Array.from({ length: Math.min(120, Math.floor(innerWidth / 10)) }, () => ({
    x: Math.random() * dCanvas.width, y: Math.random() * dCanvas.height,
    r: Math.random() * 1.8 + .3, vy: -(Math.random() * .35 + .08),
    vx: (Math.random() - .5) * .2, a: Math.random() * .6 + .2, t: Math.random() * 6
  }));
}
function runDust() { if (!dustOn) { dustOn = true; initDust(); requestAnimationFrame(dustTick); } }
function dustTick() {
  if (film.classList.contains("done")) { dustOn = false; return; }
  dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
  motes.forEach(m => {
    m.x += m.vx; m.y += m.vy; m.t += .02;
    if (m.y < -5) { m.y = dCanvas.height + 5; m.x = Math.random() * dCanvas.width; }
    dCtx.beginPath();
    dCtx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    dCtx.fillStyle = `rgba(243,220,155,${m.a * (0.6 + 0.4 * Math.sin(m.t))})`;
    dCtx.fill();
  });
  requestAnimationFrame(dustTick);
}
addEventListener("resize", initDust);

// cuando el sello toca la pantalla: temblor y chispas
film.querySelector(".stamp").addEventListener("animationend", e => {
  if (e.animationName !== "stamp") return;
  replay(film.querySelector(".shaker"), "shake");
  const r = e.target.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 120, "#f3dc9b");
});

function filmTick(now) {
  const dt = now - last; last = now;
  if (!paused) {
    elapsed += dt;
    const dur = +scenes[idx].dataset.duration;
    bars[idx].style.width = Math.min(100, elapsed / dur * 100) + "%";
    if (elapsed >= dur) {
      if (idx < scenes.length - 1) showScene(idx + 1);
      else return endFilm();
    }
  }
  rafId = requestAnimationFrame(filmTick);
}

function showPoster() {
  document.body.classList.add("locked");
  film.classList.add("poster");
  runDust();
}

function startFilm() {
  window.scrollTo(0, 0);
  document.body.classList.add("locked");
  // cierra el telón al instante y luego lo abre
  film.classList.add("reset");
  film.classList.remove("done", "poster", "open", "lights");
  void film.offsetWidth;
  film.classList.remove("reset");
  requestAnimationFrame(() => requestAnimationFrame(() => film.classList.add("open")));
  Sound.start();
  setPaused(false);
  runDust();
  idx = -1; showScene(0);
  last = performance.now();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(filmTick);
}

function endFilm() {
  cancelAnimationFrame(rafId);
  Sound.stop();
  film.classList.remove("poster", "lights", "paused");
  film.classList.add("done");
  document.body.classList.remove("locked");
  scenes.forEach(s => s.classList.remove("active", "leaving"));
  // muestra la portada con su animación
  document.querySelectorAll(".hero .reveal").forEach((el, k) =>
    setTimeout(() => el.classList.add("visible"), 300 + k * 180));
}

function setPaused(p) {
  paused = p;
  film.classList.toggle("paused", p);
  Sound.pause(p);
  btnPause.querySelector(".lbl").textContent = p ? "Reproducir" : "Pausar";
  btnPause.querySelector("svg").innerHTML = p
    ? '<path d="M7 5l12 7-12 7z"/>'
    : '<rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/>';
}

function drawMute(m) {
  btnMute.setAttribute("aria-label", m ? "Activar sonido" : "Silenciar");
  btnMute.querySelector("svg").innerHTML = '<path d="M3 9h4l5-4v14l-5-4H3z"/>' + (m
    ? '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
    : '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>');
}
drawMute(false);

document.getElementById("btnPlay").addEventListener("click", startFilm);
document.getElementById("btnSkipPoster").addEventListener("click", endFilm);
btnPause.addEventListener("click", () => setPaused(!paused));
btnMute.addEventListener("click", () => drawMute(Sound.toggleMute()));
document.getElementById("btnSkip").addEventListener("click", endFilm);
document.getElementById("btnReplay").addEventListener("click", startFilm);
addEventListener("keydown", e => {
  if (film.classList.contains("done")) return;
  if (film.classList.contains("poster")) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startFilm(); }
    if (e.key === "Escape") endFilm();
    return;
  }
  if (e.key === " ") { e.preventDefault(); setPaused(!paused); }
  if (e.key === "Escape") endFilm();
  if (e.key === "ArrowRight" && idx < scenes.length - 1) showScene(idx + 1);
});

if (reduceMotion) endFilm(); else showPoster();
