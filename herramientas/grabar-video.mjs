// =========================================================
// GRABA LA PRESENTACIÓN EN VIDEO para la sección de descargas
//
//   node herramientas/grabar-video.mjs
//
// Crea video/presentacion.mp4 (con la canción) y video/portada.jpg.
// Hay que volver a grabarlo cada vez que cambia el graduado (nombre,
// foto o género), porque el video los lleva dentro.
// Necesita Node 22 o más nuevo, Firefox y ffmpeg. Tarda unos minutos.
//
// Cómo funciona: abre la página en un Firefox sin ventana con un reloj
// virtual (temporizadores, requestAnimationFrame, performance.now y las
// animaciones CSS avanzan solo cuando el script lo pide), avanza la
// película cuadro a cuadro, toma una captura de cada uno y se los pasa
// a ffmpeg junto con la canción.
// =========================================================
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ANCHO = 1280, ALTO = 720, FPS = 30;
const SUBPASOS = 2;      // la página corre a 60 cuadros por segundo; se guarda 1 de cada 2
const FUNDIDO = 1.5;     // segundos de fundido a negro (imagen y música) al terminar
const SALIDA = path.join(RAIZ, "video");
// mismo punto de arranque de la canción que en la página
const INICIO = +(fs.readFileSync(path.join(RAIZ, "js/musica.js"), "utf8").match(/const INICIO = ([\d.]+)/) || [, 0])[1];

// Se ejecuta dentro de la página antes que sus scripts: reemplaza el reloj.
function relojVirtual() {
  let t = performance.now();
  const d0 = Date.now() - t;
  const rafs = new Map(), timers = new Map(), nacidas = new WeakMap();
  let id = 0;
  performance.now = () => t;
  Date.now = () => d0 + t;
  window.requestAnimationFrame = cb => { rafs.set(++id, cb); return id; };
  window.cancelAnimationFrame = n => rafs.delete(n);
  window.setTimeout = (cb, ms = 0, ...a) => { timers.set(++id, { at: t + (+ms || 0), cb, a }); return id; };
  window.setInterval = (cb, ms = 0, ...a) => { const every = Math.max(1, +ms || 0); timers.set(++id, { at: t + every, cb, a, every }); return id; };
  window.clearTimeout = window.clearInterval = n => timers.delete(n);
  // avanza el reloj "ms" milisegundos: temporizadores vencidos, un cuadro de animación y las animaciones CSS
  window.__paso = ms => {
    const fin = t + ms;
    for (;;) {
      let sig = null, sigId = 0;
      for (const [n, x] of timers) if (x.at <= fin && (!sig || x.at < sig.at)) { sig = x; sigId = n; }
      if (!sig) break;
      t = Math.max(t, sig.at);
      if (sig.every) sig.at += sig.every; else timers.delete(sigId);
      try { sig.cb(...sig.a); } catch (e) { console.error(e); }
    }
    t = fin;
    const cbs = [...rafs.values()]; rafs.clear();
    for (const cb of cbs) try { cb(t); } catch (e) { console.error(e); }
    for (const a of document.getAnimations()) {
      if (!nacidas.has(a)) nacidas.set(a, t - (a.currentTime || 0));
      a.pause();
      a.currentTime = t - nacidas.get(a);
    }
  };
}

// ---------- servidor local con los archivos del sitio ----------
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4" };
const servidor = http.createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (ruta.endsWith("/")) ruta += "index.html";
  const archivo = path.join(RAIZ, ruta);
  if (!archivo.startsWith(RAIZ + path.sep) || !fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TIPOS[path.extname(archivo)] || "application/octet-stream" });
  fs.createReadStream(archivo).pipe(res);
});
await new Promise(ok => servidor.listen(0, "127.0.0.1", ok));

// ---------- Firefox sin ventana, controlado por WebDriver BiDi ----------
const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "grabar-video-"));
fs.writeFileSync(path.join(perfil, "user.js"), [
  'user_pref("browser.shell.checkDefaultBrowser", false);',
  'user_pref("ui.prefersReducedMotion", 0);',
  'user_pref("media.autoplay.default", 0);'
].join("\n"));
const firefox = spawn("firefox", ["--headless", "--no-remote", "--profile", perfil, "--remote-debugging-port", "0", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });

try {
  const wsUrl = await new Promise((ok, mal) => {
    let txt = "";
    const plazo = setTimeout(() => mal(new Error("Firefox no respondió")), 30000);
    firefox.stderr.on("data", d => { txt += d; const m = txt.match(/ws:\/\/[\d.]+:\d+/); if (m) { clearTimeout(plazo); ok(m[0]); } });
    firefox.on("error", mal);
    firefox.on("exit", () => mal(new Error("Firefox se cerró:\n" + txt)));
  });
  const ws = new WebSocket(wsUrl + "/session");
  await new Promise((ok, mal) => { ws.onopen = ok; ws.onerror = () => mal(new Error("No se pudo conectar con Firefox")); });
  let n = 0;
  const espera = new Map();
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && espera.has(d.id)) { espera.get(d.id)(d); espera.delete(d.id); }
    else if (d.method === "log.entryAdded" && d.params.level === "error") console.error("  error en la página:", d.params.text);
  };
  const bidi = (method, params = {}) => new Promise((ok, mal) => {
    const id = ++n;
    espera.set(id, d => d.type === "error" ? mal(new Error(`${method}: ${d.error} ${d.message}`)) : ok(d.result));
    ws.send(JSON.stringify({ id, method, params }));
  });

  await bidi("session.new", { capabilities: {} });
  await bidi("session.subscribe", { events: ["log.entryAdded"] });
  const ctx = (await bidi("browsingContext.getTree")).contexts[0].context;
  const js = async expr => {
    const r = await bidi("script.evaluate", { expression: expr, target: { context: ctx }, awaitPromise: true });
    if (r.type === "exception") throw new Error("En la página: " + r.exceptionDetails.text);
    return r.result.value;
  };
  await bidi("browsingContext.setViewport", { context: ctx, viewport: { width: ANCHO, height: ALTO } });
  await bidi("script.addPreloadScript", { functionDeclaration: relojVirtual.toString() });
  await bidi("browsingContext.navigate", { context: ctx, url: `http://127.0.0.1:${servidor.address().port}/`, wait: "complete" });

  // fuentes cargadas, música en silencio (se agrega en ffmpeg) y sin controles ni barra de progreso
  await js(`(async () => {
    await Promise.all(['700 20px Cinzel', '500 20px Cinzel', '20px "Great Vibes"', 'italic 500 20px "Cormorant Garamond"',
      '500 20px "Cormorant Garamond"', '400 20px Inter', '500 20px Inter'].map(f => document.fonts.load(f)));
    await document.fonts.ready;
    document.getElementById("musica").muted = true;
    const s = document.createElement("style");
    s.textContent = ".film .progress, .film .controls { display: none !important; } html { scrollbar-width: none; }";
    document.head.append(s);
  })()`);
  const nombre = await js("nombre");
  const duracion = await js("scenes.reduce((t, s) => t + +s.dataset.duration, 0) / 1000");
  // la portada: unos segundos después de la revelación del nombre
  const portadaEn = await js(`(() => { let t = 0; for (const s of scenes) { if (s.hasAttribute("data-flash")) return t / 1000 + 4.5; t += +s.dataset.duration; } return 5; })()`);
  console.log(`Grabando la presentación de ${nombre}: ${duracion} s a ${FPS} cuadros por segundo, ${ANCHO}×${ALTO}`);

  fs.mkdirSync(SALIDA, { recursive: true });
  const mp4 = path.join(SALIDA, "presentacion.mp4");
  const ffmpeg = spawn("ffmpeg", ["-v", "error", "-y",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-i", path.join(RAIZ, "music", "cancion.mp3"),
    "-filter_complex",
    `[0:v]tpad=stop_mode=clone:stop_duration=${FUNDIDO},fade=t=in:d=0.5,fade=t=out:st=${duracion}:d=${FUNDIDO},format=yuv420p[v];` +
    `[1:a]atrim=start=${INICIO}:duration=${duracion + FUNDIDO},asetpts=PTS-STARTPTS,afade=t=out:st=${duracion}:d=${FUNDIDO}[a]`,
    "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart", mp4], { stdio: ["pipe", "inherit", "inherit"] });
  const ffmpegTermina = new Promise((ok, mal) => ffmpeg.on("exit", c => c ? mal(new Error("ffmpeg falló")) : ok()));

  await js("startFilm()");
  const cuadros = Math.ceil(duracion * FPS), paso = 1000 / FPS / SUBPASOS;
  for (let k = 0; k < cuadros; k++) {
    if (k) await js(`for (let i = 0; i < ${SUBPASOS}; i++) __paso(${paso})`);
    const { data } = await bidi("browsingContext.captureScreenshot", { context: ctx });
    if (!ffmpeg.stdin.write(Buffer.from(data, "base64"))) await new Promise(ok => ffmpeg.stdin.once("drain", ok));
    if (k % (FPS * 5) === 0) console.log(`  ${Math.round(k / FPS)} de ${Math.round(duracion)} s`);
  }
  ffmpeg.stdin.end();
  await ffmpegTermina;

  spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", String(portadaEn), "-i", mp4, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3",
    path.join(SALIDA, "portada.jpg")], { stdio: "inherit" });
  const mb = (fs.statSync(mp4).size / 1048576).toFixed(1);
  console.log(`Listo: video/presentacion.mp4 (${mb} MB) y video/portada.jpg`);
  console.log("Recuerda subir el número ?v= en index.html antes de publicar.");
  ws.close();
} finally {
  servidor.close();
  firefox.kill();
  await new Promise(ok => firefox.exitCode !== null ? ok() : firefox.once("exit", ok));
  fs.rmSync(perfil, { recursive: true, force: true });
}
