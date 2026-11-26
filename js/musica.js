// =========================================================
// MÚSICA DE LA INTRO: music/cancion.mp3 (el <audio id="musica"> de index.html)
// Suena desde el principio de la canción durante la presentación
// y se desvanece al terminar.
// =========================================================
const Sound = (() => {
  // Segundo de la canción con el que arranca la intro (0 = desde el principio).
  // Con 32.7 la entrada fuerte de la canción (56,1 s) cae en la revelación del nombre.
  const INICIO = 0;
  const audio = document.getElementById("musica");
  let playing = false, fade = 0;

  // si la canción no carga o el navegador no la deja sonar, lo dice en la consola
  audio.addEventListener("error", () =>
    console.warn(`No se pudo cargar la música (${audio.currentSrc}), código ${audio.error && audio.error.code}.`));
  const play = () => audio.play().catch(e => console.warn("No se pudo reproducir la música:", e.name, e.message));
  // algunos Safari fallan al mover la canción antes de que cargue: eso nunca debe impedir que suene
  const seek = t => { try { if (Math.abs(audio.currentTime - t) > .05) audio.currentTime = t; } catch {} };

  // deja la canción cargada en el punto de arranque
  if (INICIO) {
    const cue = () => { if (!playing) seek(INICIO); };
    if (audio.readyState >= 1) cue(); else audio.addEventListener("loadedmetadata", cue, { once: true });
  }

  // baja el volumen poco a poco (en iPhone el volumen es fijo: ahí solo se detiene)
  function fadeOut(ms, done) {
    clearInterval(fade);
    const from = audio.volume, t0 = performance.now();
    fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = Math.max(0, from * (1 - k));
      if (k === 1) { clearInterval(fade); done(); }
    }, 30);
  }

  function start() {
    playing = true;
    clearInterval(fade);
    audio.volume = 1;
    seek(INICIO);
    play();
  }
  function stop() {
    playing = false;
    fadeOut(1500, () => audio.pause());
  }
  function pause(p) {
    if (p) audio.pause();
    else if (playing) play();
  }
  function toggleMute() { return audio.muted = !audio.muted; }
  return { start, stop, pause, toggleMute };
})();
