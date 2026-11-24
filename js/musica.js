// =========================================================
// MÚSICA CEREMONIAL (sintetizada en el navegador, sin archivos)
// =========================================================
const Sound = (() => {
  let ctx = null, master, verbIn, bus = null, noise, muted = false;
  const mtof = m => 440 * 2 ** ((m - 69) / 12);

  function init() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 6; comp.attack.value = .004; comp.release.value = .2;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1;
    // limitador + saturación suave: suena fuerte sin distorsionar los parlantes
    const trim = ctx.createGain(); trim.gain.value = .6;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = .001; limiter.release.value = .12;
    const clip = ctx.createWaveShaper(), curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) { const x = i / 1023.5 - 1; curve[i] = Math.tanh(1.3 * x) / Math.tanh(1.3); }
    clip.curve = curve; clip.oversample = "2x";
    master.connect(comp).connect(trim).connect(limiter).connect(clip).connect(ctx.destination);
    // reverberación de "salón de ceremonias"
    const verb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.5, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.8;
    }
    verb.buffer = ir;
    verbIn = ctx.createGain(); verbIn.gain.value = .4;
    verbIn.connect(verb).connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  // cada reproducción usa su propio bus para poder silenciarla de golpe
  function start() {
    init(); if (!ctx) return;
    stop(.05);
    bus = ctx.createGain(); bus.connect(master); bus.connect(verbIn);
  }
  function stop(fade = .8) {
    if (!bus) return;
    const b = bus; bus = null;
    b.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
    setTimeout(() => b.disconnect(), fade * 1000 + 300);
  }
  function pause(p) { if (ctx) p ? ctx.suspend() : ctx.resume(); }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, .05);
    return muted;
  }

  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; return s; };
  const filter = (type, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

  function brass(m, t, d, v = .1) {
    const f = mtof(m), g = ctx.createGain(), lp = filter("lowpass", f, 2);
    lp.frequency.setValueAtTime(f * 1.2, t);
    lp.frequency.linearRampToValueAtTime(Math.min(f * 8, 9000), t + .07);
    lp.frequency.setTargetAtTime(Math.min(f * 4, 6000), t + .07, .3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + .04);
    g.gain.setTargetAtTime(v * .7, t + .04, .25);
    g.gain.setTargetAtTime(0, t + d, .1);
    lp.connect(g).connect(bus);
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 5.3;
    lfoG.gain.setValueAtTime(0, t); lfoG.gain.linearRampToValueAtTime(9, t + .45);
    lfo.connect(lfoG); lfo.start(t); lfo.stop(t + d + .8);
    [-6, 0, 5].forEach(dt => {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = f; o.detune.value = dt;
      lfoG.connect(o.detune); o.connect(lp); o.start(t); o.stop(t + d + .8);
    });
  }
  function timp(m, t, v = .7, dec = 1.6) {
    const f = mtof(m), o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + .08);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dec);
    o.connect(g).connect(bus); o.start(t); o.stop(t + dec);
    const n = noiseSrc(), ng = ctx.createGain();
    ng.gain.setValueAtTime(v * .5, t); ng.gain.exponentialRampToValueAtTime(.001, t + .15);
    n.connect(filter("bandpass", f * 3)).connect(ng).connect(bus); n.start(t); n.stop(t + .2);
  }
  function roll(m, t, d) {
    for (let x = 0, k = 0; x < d; x += .055, k++) { const at = t + x, mm = m + (k % 2) * .2, vv = .05 + .45 * (x / d) ** 2; later(at, () => timp(mm, at, vv, .4)); }
  }
  function cymbal(t, v = .35) {
    const n = noiseSrc(), g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + 3);
    n.connect(filter("highpass", 5500)).connect(g).connect(bus); n.start(t); n.stop(t + 3.1);
  }
  function swell(t, d, v = .12) {
    const n = noiseSrc(), g = ctx.createGain(), bp = filter("bandpass", 250, 4);
    bp.frequency.exponentialRampToValueAtTime(4000, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + d);
    g.gain.setTargetAtTime(0, t + d, .05);
    n.connect(bp).connect(g).connect(bus); n.start(t); n.stop(t + d + .4);
  }
  function chime(m, t, v = .08) {
    const f = mtof(m);
    [[1, 1], [2, .3], [3.01, .1]].forEach(([h, a]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f * h;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * a, t + .005);
      g.gain.exponentialRampToValueAtTime(.0001, t + 2.2);
      o.connect(g).connect(bus); o.start(t); o.stop(t + 2.3);
    });
  }
  function pad(ms, t, d, v = .045) {
    const g = ctx.createGain(), lp = filter("lowpass", 900);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 1);
    g.gain.setTargetAtTime(0, t + d, .5);
    lp.connect(g).connect(bus);
    ms.forEach(m => [-7, 7].forEach(dt => {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + d + 2.5);
    }));
  }
  // crea cada sonido medio segundo antes de que suene, en vez de cientos de golpe al iniciar la escena
  function later(at, fn) {
    const wait = at - ctx.currentTime - .5;
    if (wait <= 0) return fn();
    const b = bus;
    setTimeout(() => { if (bus && bus === b) fn(); }, wait * 1000);
  }
  const phrase = (t, notes, v) => notes.forEach(([m, at, d]) => later(t + at, () => brass(m, t + at, d, v)));
  const chords = (t, list, v) => list.forEach(([ms, at, d]) => later(t + at, () => ms.forEach(m => brass(m, t + at, d, v))));

  // ---------- percusión y cuerdas para la banda sonora épica ----------
  function kick(t, v = .9) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .45);
    o.connect(g).connect(bus); o.start(t); o.stop(t + .5);
  }
  function snare(t, v = .35) {
    const n = noiseSrc(), g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .2);
    n.connect(filter("bandpass", 2200, .6)).connect(g).connect(bus); n.start(t); n.stop(t + .22);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(160, t + .08);
    og.gain.setValueAtTime(v * .6, t); og.gain.exponentialRampToValueAtTime(.001, t + .12);
    o.connect(og).connect(bus); o.start(t); o.stop(t + .14);
  }
  function hat(t, v = .06) {
    const n = noiseSrc(), g = ctx.createGain();
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .05);
    n.connect(filter("highpass", 7500)).connect(g).connect(bus); n.start(t); n.stop(t + .06);
  }
  const taiko = (t, v = .8) => { timp(31, t, v, 1.1); kick(t, v * .7); };
  function string(m, t, d = .2, v = .035) {
    const f = mtof(m), g = ctx.createGain(), lp = filter("lowpass", 3200, .7);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .008);
    g.gain.exponentialRampToValueAtTime(.001, t + d);
    lp.connect(g).connect(bus);
    [-8, 8].forEach(dt => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + d + .05);
    });
  }
  function bass(m, t, d, v = .14) {
    const f = mtof(m), g = ctx.createGain(), lp = filter("lowpass", 420, 1.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01);
    g.gain.setTargetAtTime(v * .6, t + .05, .2); g.gain.setTargetAtTime(0, t + d, .06);
    lp.connect(g).connect(bus);
    [["sawtooth", f], ["sine", f / 2]].forEach(([type, fr]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr;
      o.connect(lp); o.start(t); o.stop(t + d + .4);
    });
  }

  // progresión heroica (vi–IV–I–V) a 120 bpm: 1 compás = 2 s
  const BAR = 2, E8 = .25;
  const PROG = [
    { c: [57, 60, 64], b: 33 }, { c: [57, 60, 65], b: 29 },
    { c: [55, 60, 64], b: 36 }, { c: [55, 59, 62], b: 31 }
  ];
  const ARP = [0, 1, 2, 1, 2, 1, 0, 1];
  // toca compases desde t durante "dur" segundos con las capas pedidas
  function groove(t, dur, o = {}) {
    const end = t + dur, first = o.from || 0;
    for (let k = 0; t + k * BAR < end; k++) later(t + k * BAR, () => {
      const bt = t + k * BAR, ch = PROG[(k + first) % 4];
      for (let s = 0; s < 8; s++) {
        const st = bt + s * E8;
        if (st >= end) break;
        if (o.strings) string(ch.c[ARP[s]] + 12, st, .2, o.strings);
        if (o.low) string(ch.c[ARP[(s + 3) % 8]], st, .18, o.low);
        if (o.hats) hat(st, s % 2 ? o.hats * .6 : o.hats);
        if (o.kick && (s % 4 === 0 || (o.four && s % 2 === 0))) kick(st, o.kick);
        if (o.kick && o.drive && s === 7) kick(st, o.kick * .7);
        if (o.snare && (s === 2 || s === 6)) snare(st, o.snare);
      }
      if (o.bass) [0, 3, 4, 6].forEach(s => bt + s * E8 < end && bass(ch.b + 12, bt + s * E8, s === 0 ? .7 : .2, o.bass));
      if (o.pad) pad(ch.c.map(m => m - 12), bt, Math.min(BAR, end - bt), o.pad);
      if (o.stab && bt < end) chords(bt, [[ch.c, 0, .35]], o.stab);
      if (o.crash && k % 2 === 0) cymbal(bt, o.crash);
      if (o.taiko) taiko(bt, o.taiko);
    });
  }
  function snareRoll(t, d, v = .4) {
    for (let x = 0; x < d; x += .06 - .03 * (x / d)) { const at = t + x, vv = .05 + v * (x / d) ** 1.6; later(at, () => snare(at, vv)); }
  }
  // melodía heroica de metales sobre la progresión
  const HERO = [[76, 0, .75], [74, .75, .25], [72, 1, 1], [72, 2, .5], [69, 2.5, .5], [72, 3, 1], [79, 4, 1.5], [76, 5.5, .5], [74, 6, .75], [72, 6.75, .25], [74, 7, 1]];

  const cues = {
    open(t) {
      roll(36, t, 1.4); swell(t, 1.4, .1);
      taiko(t + 1.45, 1); cymbal(t + 1.45, .35);
      phrase(t + 1.45, [[67, 0, .14], [67, .17, .14], [67, .34, .14], [72, .51, 1.4]], .15);
      chords(t + 1.96, [[[48, 60, 64, 67], 0, 1.4]], .08);
      taiko(t + 1.96, .7);
      groove(t + 3.5, 4, { strings: .03, bass: .1, kick: .6, pad: .03 });
    },
    reflect(t) {
      groove(t, 5.6, { strings: .04, low: .018, bass: .12, kick: .75, hats: .05, pad: .035 });
      chime(76, t + .1); chime(81, t + .6); chime(84, t + 1.2);
    },
    build(t) {
      groove(t, 6.4, { from: 2, strings: .045, low: .022, bass: .13, kick: .85, four: true, snare: .28, hats: .07, pad: .04, stab: .05 });
      [0, .5, 1.1, 1.8].forEach(at => taiko(t + at, .7));
      swell(t + 4.4, 2, .1);
    },
    roll(t) {
      snareRoll(t, 3.6, .45); swell(t, 3.7, .16);
      [0, 1, 1.75, 2.25, 2.6, 2.9, 3.1, 3.3, 3.45, 3.6].forEach((at, k) => taiko(t + at, .45 + k * .05));
      chords(t, [[[55, 59, 62, 67], 0, 3.7]], .04);
      pad([43, 50, 55, 62], t, 3.7, .04);
    },
    reveal(t) {
      taiko(t, 1); kick(t, 1); timp(24, t, .8, 2.2); cymbal(t, .5);
      phrase(t, [[72, 0, .5], [67, .5, .16], [72, .66, .16], [76, .82, .6], [74, 1.42, .2], [76, 1.62, .2], [79, 1.82, 2.4]], .15);
      chords(t, [
        [[48, 55, 60, 64], 0, .82], [[52, 55, 60, 64], .82, .6],
        [[43, 55, 59, 62], 1.42, .4], [[48, 55, 60, 64, 67], 1.82, 2.4]
      ], .07);
      taiko(t + 1.82, 1); cymbal(t + 1.82, .45);
      [84, 88, 91, 96, 91, 96, 100].forEach((m, k) => chime(m, t + 2.4 + k * .09, .06));
      groove(t + 1.82, 7, { from: 2, strings: .05, low: .025, bass: .15, kick: 1, four: true, drive: true, snare: .34, hats: .08, pad: .045, crash: .3, stab: .045 });
      phrase(t + 3.82, HERO.slice(0, 7), .12);
    },
    invest(t) {
      groove(t, 8.6, { strings: .045, low: .022, bass: .14, kick: .95, four: true, drive: true, snare: .32, hats: .075, pad: .045, crash: .25 });
      phrase(t + .4, HERO, .12);
      [60, 64, 67, 72, 76, 79].forEach((m, k) => chime(m, t + .8 + k * .12, .05)); // toga
      chime(84, t + 2.9, .07); chime(88, t + 3.05, .06);                         // estola
      swell(t + 3.3, 1, .08);                                                    // birrete bajando
      chime(79, t + 5.4, .05); chime(84, t + 5.55, .05); chime(91, t + 5.7, .04); // diploma
    },
    seal(t) {
      groove(t, 1.3, { from: 3, strings: .045, bass: .13, kick: .9, four: true, hats: .08 });
      snareRoll(t + .2, 1.1, .45); swell(t + .2, 1.1, .12);
    }
  };
  function cue(name) {
    if (!bus || !cues[name]) return;
    cues[name](ctx.currentTime + .06);
  }
  // golpe del sello y acorde final
  function impact() {
    if (!bus) return;
    const t = ctx.currentTime + .01;
    taiko(t, 1.1); kick(t, 1); timp(24, t, .9, 2.4); cymbal(t, .55);
    chords(t, [[[48, 55, 60, 64, 67], 0, 3.6]], .075); brass(72, t, 3.6, .13); brass(76, t, 3.6, .1);
    pad([36, 48, 55, 64], t, 5, .06);
    // cierre: dos compases más con todo y golpe final
    groove(t + .5, 4, { strings: .045, low: .02, bass: .14, kick: .9, four: true, snare: .3, hats: .07, crash: .25 });
    taiko(t + 4.5, 1.1); cymbal(t + 4.5, .5); chords(t + 4.5, [[[48, 55, 60, 64, 72], 0, 2.5]], .08);
  }
  function pop() {
    if (!bus) return;
    const t = ctx.currentTime + .01, n = noiseSrc(), g = ctx.createGain();
    g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.001, t + .4);
    n.connect(filter("bandpass", 700 + Math.random() * 800, .8)).connect(g).connect(bus);
    n.start(t); n.stop(t + .45);
    for (let k = 0; k < 6; k++) { // chisporroteo
      const tc = t + .25 + Math.random() * .7, c = noiseSrc(), cg = ctx.createGain();
      cg.gain.setValueAtTime(.12, tc); cg.gain.exponentialRampToValueAtTime(.001, tc + .04);
      c.connect(filter("highpass", 4000)).connect(cg).connect(bus); c.start(tc); c.stop(tc + .05);
    }
  }
  // el birrete se posa en la cabeza
  function capLand() {
    if (!bus) return;
    const t = ctx.currentTime + .01;
    timp(43, t, .55); chime(91, t, .07); chime(96, t + .08, .05);
    chords(t, [[[55, 60, 64, 67], 0, 1.8]], .045);
  }
  return { start, stop, pause, toggleMute, cue, impact, capLand, pop };
})();
