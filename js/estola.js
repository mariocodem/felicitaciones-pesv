// =========================================================
// ESTOLA: tela simulada que cae desde arriba como una bufanda
// que se suelta y queda colgando alrededor del texto
// =========================================================
const Stole = (() => {
  const box = film.querySelector(".invest"), scene = box.closest(".scene");
  const copy = box.querySelector(".copy"), cv = box.querySelector(".stole-canvas"), g = cv.getContext("2d");
  // texto bordado en cada lado de la estola
  const IZQ = "Corporación PESV", DER = `${segunGenero("Conciliador", "Conciliadora")} en Derecho`;
  cv.setAttribute("aria-label", `Estola de graduación: ${IZQ} · ${DER}`);
  const LEFT = IZQ.toUpperCase(), RIGHT = DER.toUpperCase();
  const SATIN = ["#5c0d1c", "#7e1629", "#901c31", "#9c2137", "#a4263d", "#9c2137", "#901c31", "#7e1629", "#5c0d1c"];
  const GRAV = 1900, STEP = 1 / 120;
  let P = [], N = 0, seg = 0, geo = null, running = false, last = 0, acc = 0, t = 0, dpr = 1, releaseAt = 0, lowQuality = false, slow = 0, sharp = false;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // barra invisible (cápsula) sobre el texto y largo de la estola
  function layout() {
    const W = innerWidth, H = innerHeight;
    dpr = lowQuality || !sharp ? 1 : Math.min(1.25, devicePixelRatio || 1);
    const cw0 = Math.round(W * dpr), ch0 = Math.round(H * dpr);
    if (cv.width !== cw0 || cv.height !== ch0) { cv.width = cw0; cv.height = ch0; }
    else g.clearRect(0, 0, cv.width, cv.height);
    lastBox = null;
    const band = clamp(Math.min(W, H) * .054, 22, 46), gap = clamp(W * .03, 14, 38);
    const ox = box.clientWidth / 2 - W / 2, oy = box.clientHeight / 2 - H / 2;
    const x0 = copy.offsetLeft - ox, y0 = copy.offsetTop - oy, cw = copy.offsetWidth, ch = copy.offsetHeight;
    const cx = x0 + cw / 2, hw = cw / 2 + gap + band / 2;
    const R = Math.min(hw * .45, band * 1.4 + 26);
    const ya = y0 - gap - band / 2 + R;
    const bandLen = Math.max(80, y0 + ch + gap + band * .9 - ya);
    const L = 2 * bandLen + 2 * (hw - R) + Math.PI * R;
    geo = { W, H, cx, hw, R, ya, band, bandLen, L, ax: cx - hw + R, bx: cx + hw - R };
  }
  // punto de la forma final (para colocarla ya asentada al redimensionar)
  function draped(a) {
    const { cx, hw, R, ya, bandLen, ax, bx, L } = geo, top = bx - ax, q = Math.PI * R / 2;
    if (a <= bandLen) return [cx - hw, ya + bandLen - a];
    a -= bandLen;
    if (a <= q) { const th = Math.PI + a / R; return [ax + R * Math.cos(th), ya + R * Math.sin(th)]; }
    a -= q;
    if (a <= top) return [ax + a, ya - R];
    a -= top;
    if (a <= q) { const th = 1.5 * Math.PI + a / R; return [bx + R * Math.cos(th), ya + R * Math.sin(th)]; }
    a -= q;
    return [cx + hw, ya + Math.min(a, bandLen)];
  }
  function init(fall) {
    layout();
    const { L, cx, W, band } = geo;
    N = clamp(Math.round(L / 8), 60, 130); seg = L / (N - 1);
    nx = new Float32Array(N); ny = new Float32Array(N); A = new Float32Array(N);
    P = [];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1) - .5;
      let x, y;
      if (fall) {
        // sostenida por los extremos, arriba de la pantalla, con el centro colgando
        x = cx + u * Math.min(L * .7, W * 1.2);
        y = -band * 2 - (1 - Math.cos(u * Math.PI)) * 70 + Math.sin(u * 17) * 8;
      } else [x, y] = draped(i * seg);
      P.push({ x, y, px: x, py: y });
    }
    t = 0; acc = 0;
  }

  function link(a, b, rest, k, pushOnly) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt((dx) ** 2 + (dy) ** 2) || 1e-6;
    if (pushOnly && d >= rest) return;
    const f = (d - rest) / d * .5 * k;
    a.x += dx * f; a.y += dy * f; b.x -= dx * f; b.y -= dy * f;
  }
  function collide(p) {
    const qx = clamp(p.x, geo.ax, geo.bx), dx = p.x - qx, dy = p.y - geo.ya, d = Math.sqrt((dx) ** 2 + (dy) ** 2);
    if (d < geo.R && d > 1e-6) {
      const s = geo.R / d;
      p.x = qx + dx * s; p.y = geo.ya + dy * s;
      p.px += (p.x - p.px) * .2; p.py += (p.y - p.py) * .2;   // fricción con la barra
    }
  }
  function step(dt) {
    t += dt;
    const breeze = clamp((t - 2.2) / 2.5, 0, 1);
    for (let i = 0; i < N; i++) {
      const p = P[i], u = Math.abs(i / (N - 1) - .5) * 2;
      const vx = (p.x - p.px) * .99, vy = (p.y - p.py) * .99;
      p.px = p.x; p.py = p.y;
      const wind = breeze * u * u * (70 * Math.sin(t * .9 + i * .05) + 25 * Math.sin(t * 2.3 + i * .13));
      p.x += vx + wind * dt * dt;
      p.y += vy + GRAV * dt * dt;
    }
    for (let k = 0; k < 10; k++) {
      for (let i = 0; i < N - 1; i++) link(P[i], P[i + 1], seg, 1);
      if (k % 2 === 0) for (let i = 0; i < N - 2; i++) link(P[i], P[i + 2], seg * 1.97, .15, true);
      for (let i = 0; i < N; i++) collide(P[i]);
    }
    const m = P[N >> 1]; m.x += (geo.cx - m.x) * .01;   // se mantiene centrada
  }

  // capas del satén: del borde (más oscuro) al centro (más claro), sobre la misma línea
  const SATIN_LAYERS = [[1, "#5c0d1c"], [.78, "#86182d"], [.36, "#9e2439"]];
  const DARK = [.08, .16, .26, .38], LITE = [.05, .1, .17, .26];
  let nx, ny, A, lastBox = null, widths = { fs: 0 };
  const gold = "rgba(236,204,132,.95)";

  // anchos de cada letra, medidos una sola vez por tamaño
  function measure(fs) {
    if (widths.fs === fs) return widths;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = `700 ${fs}px Cinzel, serif`;
    const m = str => { const w = [...str].map(ch => g.measureText(ch).width); return { w, T: w.reduce((s, v) => s + v, 0) + fs * .32 * (w.length - 1) }; };
    return widths = { fs, L: m(LEFT), R: m(RIGHT) };
  }

  function draw() {
    const { band } = geo, n = N;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // borra solo la zona que ocupaba la estola en el cuadro anterior
    if (lastBox) g.clearRect(lastBox[0], lastBox[1], lastBox[2], lastBox[3]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < n; i++) {
      const a = P[i > 0 ? i - 1 : 0], b = P[i < n - 1 ? i + 1 : n - 1], p = P[i];
      const tx = b.x - a.x, ty = b.y - a.y, l = Math.sqrt((tx) ** 2 + (ty) ** 2) || 1;
      nx[i] = -ty / l; ny[i] = tx / l;
      A[i] = i ? A[i - 1] + Math.sqrt((p.x - P[i - 1].x) ** 2 + (p.y - P[i - 1].y) ** 2) : 0;
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    }
    const mg = band * 1.5 + 24;
    lastBox = [x0 - mg, y0 - mg, x1 - x0 + 2 * mg, y1 - y0 + 2 * mg];

    const line = (off, dy = 0) => {
      const path = new Path2D();
      for (let i = 0; i < n; i++) { const x = P[i].x + nx[i] * off, y = P[i].y + ny[i] * off + dy; i ? path.lineTo(x, y) : path.moveTo(x, y); }
      return path;
    };
    g.lineJoin = "bevel"; g.lineCap = "butt";
    // sombra suave sobre el fondo (dos trazos translúcidos, sin desenfoque)
    const shadow = line(0, 9);
    g.strokeStyle = "rgba(0,0,0,.28)"; g.lineWidth = band + 8; g.stroke(shadow);
    // satén
    const mid = line(0);
    for (const [f, c] of SATIN_LAYERS) { g.strokeStyle = c; g.lineWidth = band * f; g.stroke(mid); }
    // pliegues y brillo, agrupados por intensidad (pocos trazos por cuadro)
    const sheenAt = (t * 300) % (geo.L + 800) - 400;
    const dk = DARK.map(() => new Path2D()), lt = LITE.map(() => new Path2D());
    for (let i = 1; i < n - 2; i++) {
      const a = P[i], b = P[i + 1], c = P[i - 1];
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.sqrt((dx) ** 2 + (dy) ** 2) || 1;
      const bend = Math.abs(Math.atan2(dx * (a.y - c.y) - dy * (a.x - c.x), dx * (a.x - c.x) + dy * (a.y - c.y)));
      const dark = Math.min(.45, bend * 2.2);
      const s = (A[i] - sheenAt) / 90, lite = Math.abs(dx) / l * .07 + (s > -3 && s < 3 ? Math.exp(-s * s) * .22 : 0);
      if (dark > .04) { const k = Math.min(3, Math.floor(dark / .1)); dk[k].moveTo(a.x, a.y); dk[k].lineTo(b.x, b.y); }
      if (lite > .03) { const k = Math.min(3, Math.floor(lite / .065)); lt[k].moveTo(a.x, a.y); lt[k].lineTo(b.x, b.y); }
    }
    g.lineWidth = band * .98;
    dk.forEach((path, k) => { g.strokeStyle = `rgba(0,0,0,${DARK[k]})`; g.stroke(path); });
    lt.forEach((path, k) => { g.strokeStyle = `rgba(255,236,240,${LITE[k]})`; g.stroke(path); });
    // ribete dorado
    g.lineWidth = 1.4; g.strokeStyle = gold;
    g.stroke(line(band / 2 - band * .13)); g.stroke(line(-band / 2 + band * .13));
    // barras doradas y flecos en las puntas
    const bars = new Path2D(), fringe = new Path2D();
    [[0, 1], [n - 1, -1]].forEach(([i, dir]) => {
      const j = i + dir * 3, p = P[i];
      let ex = p.x - P[i + dir].x, ey = p.y - P[i + dir].y; const el = Math.sqrt((ex) ** 2 + (ey) ** 2) || 1; ex /= el; ey /= el;
      bars.moveTo(P[j].x + nx[j] * band / 2, P[j].y + ny[j] * band / 2); bars.lineTo(P[j].x - nx[j] * band / 2, P[j].y - ny[j] * band / 2);
      const vx = p.x - p.px, vy = p.y - p.py;
      for (let f = 0; f < 12; f++) {
        const o = -band / 2 + (f + .5) * band / 12, len = band * .42 + (f % 2) * 3;
        const sx = p.x + nx[i] * o, sy = p.y + ny[i] * o;
        fringe.moveTo(sx, sy); fringe.lineTo(sx + ex * len - vx * 2, sy + ey * len - vy * 2);
      }
    });
    g.lineWidth = 2; g.stroke(bars);
    g.strokeStyle = "#e6c77a"; g.lineWidth = 1.2; g.stroke(fringe);

    // letras bordadas que siguen la tela (anchos en caché, sin sombras)
    const total = A[n - 1], bandLen = geo.bandLen * (total / geo.L);
    let W = measure(Math.round(band * .46));
    const worst = Math.max(W.L.T, W.R.T);
    if (worst > bandLen * .82) W = measure(Math.max(8, Math.floor(W.fs * bandLen * .82 / worst)));
    g.font = `700 ${W.fs}px Cinzel, serif`; g.fillStyle = "#f1d690"; g.textBaseline = "middle";
    const words = (str, m, center, dir) => {
      let off = 0, i = 1;
      [...str].forEach((ch, k) => {
        const a = center + dir * (off + m.w[k] / 2 - m.T / 2);
        if (dir > 0) { while (i < n - 1 && A[i] < a) i++; } else { i = n - 1; while (i > 1 && A[i - 1] > a) i--; }
        const s = (a - A[i - 1]) / ((A[i] - A[i - 1]) || 1);
        const x = P[i - 1].x + (P[i].x - P[i - 1].x) * s, y = P[i - 1].y + (P[i].y - P[i - 1].y) * s;
        const ang = Math.atan2(dir * (P[i].y - P[i - 1].y), dir * (P[i].x - P[i - 1].x)), co = Math.cos(ang), si = Math.sin(ang);
        g.setTransform(dpr * co, dpr * si, -dpr * si, dpr * co, dpr * x, dpr * y);
        g.fillText(ch, -m.w[k] / 2, 0);
        off += m.w[k] + W.fs * .32;
      });
    };
    words(LEFT, W.L, bandLen * .54, -1);
    words(RIGHT, W.R, total - bandLen * .54, 1);
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!paused) {
      if (now >= releaseAt) {
        acc += dt;
        // como máximo 3 pasos por cuadro: en equipos lentos no se acumula trabajo
        for (let k = 0; k < 3 && acc >= STEP; k++) { step(STEP); acc -= STEP; }
        if (acc >= STEP) acc = 0;
      }
      draw();
      // si el equipo va lento, baja la resolución del lienzo una sola vez
      slow = dt > .03 ? slow + 1 : 0;
      if (slow > 20 && !lowQuality && dpr > 1) { lowQuality = true; layout(); }
      if (!sharp && t > 4.2) { sharp = true; if (!lowQuality) layout(); }
    }
    requestAnimationFrame(frame);
  }
  function start() {
    sharp = false;   // mientras cae se dibuja a resolución normal; al quedar quieta, en alta
    init(true);
    releaseAt = performance.now() + 300;
    last = performance.now();
    if (!running) { running = true; requestAnimationFrame(frame); }
  }
  function stop() { running = false; g.clearRect(0, 0, cv.width, cv.height); }

  new MutationObserver(() => {
    if (scene.classList.contains("active") && !scene.classList.contains("leaving")) { if (!running) start(); }
    else if (!scene.classList.contains("active")) stop();
  }).observe(scene, { attributes: true, attributeFilter: ["class"] });
  addEventListener("resize", () => { if (running) init(false); });
  (window.requestIdleCallback || setTimeout)(() => { layout(); measure(Math.round(geo.band * .46)); });
  return { start, stop };
})();
