// =========================================================
// CONFETI, FUEGOS ARTIFICIALES Y BIRRETES AL AIRE
// =========================================================
// con "reducir movimiento" activado en el sistema no hay efectos ni intro
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const cCanvas = document.getElementById("confetti");
const cCtx = cCanvas.getContext("2d");
const cColors = ["#d4ae5a", "#f3dc9b", "#ffffff", "#9c7a2e", "#3d5a99"];
const fwColors = ["#f3dc9b", "#d4ae5a", "#ffe9b0", "#ffffff", "#8fb4ff", "#ff9fb0"];
const pick = a => a[Math.floor(Math.random() * a.length)];
let pieces = [], cRunning = false;

function sizeCanvas(c) { c.width = innerWidth; c.height = innerHeight; }
function kick() { if (!cRunning) { cRunning = true; requestAnimationFrame(particlesTick); } }
function launchConfetti(count = 200) {
  if (reduceMotion) return;
  for (let i = 0; i < count; i++) {
    const fromLeft = i % 2 === 0;
    pieces.push({
      k: "c",
      x: fromLeft ? -10 : cCanvas.width + 10,
      y: cCanvas.height * (0.55 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (4 + Math.random() * 8),
      vy: -(9 + Math.random() * 9),
      w: 6 + Math.random() * 6, h: 9 + Math.random() * 10,
      rot: Math.random() * Math.PI, vr: -0.2 + Math.random() * 0.4,
      color: pick(cColors)
    });
  }
  kick();
}
function burst(x, y, n = 90, color = pick(fwColors)) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5.5;
    pieces.push({
      k: "s", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 1, decay: .011 + Math.random() * .012, color: Math.random() < .2 ? "#fff" : color
    });
  }
  kick();
}
function launchFireworks(n = 5, span = 3000) {
  if (reduceMotion) return;
  for (let i = 0; i < n; i++) setTimeout(() => {
    const H = cCanvas.height, ty = H * (.12 + Math.random() * .3);
    pieces.push({ k: "r", x: cCanvas.width * (.15 + Math.random() * .7), y: H, vx: (Math.random() - .5) * 1.5, vy: -Math.sqrt(2 * .12 * (H - ty)) });
    kick();
  }, i * span / n + Math.random() * 250);
}
function launchCaps(n = 14) {
  if (reduceMotion) return;
  const W = cCanvas.width, H = cCanvas.height;
  for (let i = 0; i < n; i++) setTimeout(() => {
    pieces.push({
      k: "cap", x: W * (.1 + Math.random() * .8), y: H + 30,
      vx: (Math.random() - .5) * 4, vy: -Math.sqrt(2 * .3 * H * (.55 + Math.random() * .35)),
      rot: (Math.random() - .5) * .6, vr: (Math.random() - .5) * .12, flip: Math.random() * 6, s: 14 + Math.random() * 10
    });
    kick();
  }, i * 90 + Math.random() * 120);
}
function drawCap(p) {
  const s = p.s;
  cCtx.save(); cCtx.translate(p.x, p.y); cCtx.rotate(p.rot); cCtx.scale(1, .45 + .55 * Math.abs(Math.cos(p.flip)));
  cCtx.fillStyle = "#0b0f1d";
  cCtx.fillRect(-s * .5, 0, s, s * .45);
  cCtx.beginPath(); cCtx.moveTo(0, -s * .5); cCtx.lineTo(s * 1.1, 0); cCtx.lineTo(0, s * .5); cCtx.lineTo(-s * 1.1, 0); cCtx.closePath();
  cCtx.fillStyle = "#1a2238"; cCtx.fill();
  cCtx.strokeStyle = "#d4ae5a"; cCtx.lineWidth = 1.5; cCtx.stroke();
  cCtx.strokeStyle = "#f3dc9b"; cCtx.lineWidth = 1.5;
  cCtx.beginPath(); cCtx.moveTo(0, 0); cCtx.lineTo(s * .75, s * .15); cCtx.lineTo(s * .75, s * .8); cCtx.stroke();
  cCtx.fillStyle = "#d4ae5a"; cCtx.fillRect(s * .75 - 2.5, s * .75, 5, s * .35);
  cCtx.restore();
}
function particlesTick() {
  cCtx.clearRect(0, 0, cCanvas.width, cCanvas.height);
  pieces.forEach(p => {
    if (p.k === "c") {
      p.vy += 0.28; p.vx *= 0.985;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      cCtx.save(); cCtx.translate(p.x, p.y); cCtx.rotate(p.rot);
      cCtx.fillStyle = p.color;
      cCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot)));
      cCtx.restore();
      return;
    }
    if (p.k === "cap") {
      p.vy += .3; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.flip += .08;
      drawCap(p);
      return;
    }
    cCtx.globalCompositeOperation = "lighter";
    if (p.k === "r") {
      p.vy += .12; p.x += p.vx; p.y += p.vy;
      cCtx.strokeStyle = "rgba(255,233,176,.9)"; cCtx.lineWidth = 2;
      cCtx.beginPath(); cCtx.moveTo(p.x, p.y); cCtx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); cCtx.stroke();
      if (p.vy >= -.5) { p.dead = true; burst(p.x, p.y); }
    } else {
      p.vx *= .97; p.vy = p.vy * .97 + .05;
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      cCtx.globalAlpha = Math.max(0, p.life);
      cCtx.strokeStyle = p.color; cCtx.lineWidth = 2;
      cCtx.beginPath(); cCtx.moveTo(p.x, p.y); cCtx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4); cCtx.stroke();
      cCtx.globalAlpha = 1;
    }
    cCtx.globalCompositeOperation = "source-over";
  });
  pieces = pieces.filter(p => p.k === "c" ? p.y < cCanvas.height + 40 : p.k === "cap" ? !(p.vy > 0 && p.y > cCanvas.height + 60) : p.k === "r" ? !p.dead : p.life > 0);
  if (pieces.length) requestAnimationFrame(particlesTick);
  else { cRunning = false; cCtx.clearRect(0, 0, cCanvas.width, cCanvas.height); }
}
addEventListener("resize", () => sizeCanvas(cCanvas));
sizeCanvas(cCanvas);
