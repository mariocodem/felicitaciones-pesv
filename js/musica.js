// =========================================================
// MÚSICA DE LA INTRO: music/cancion.mp3 (el <audio id="musica"> de index.html)
// Suena durante la presentación y se desvanece al terminar.
// =========================================================
const Sound = (() => {
  // Segundo de la canción con el que arranca la intro. Con 32.7 la entrada fuerte
  // de la canción (56,1 s) cae justo en la revelación del nombre (escena 5, a los 23,4 s).
  // Pon 0 para empezar desde el principio de la canción.
  const INICIO = 32.7;
  const audio = document.getElementById("musica");
  let playing = false, fade = 0;

  // cambia el volumen poco a poco (en iPhone el volumen es fijo: ahí solo arranca o se detiene)
  function ramp(to, ms, done) {
    clearInterval(fade);
    const from = audio.volume, t0 = performance.now();
    fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = from + (to - from) * k;
      if (k === 1) { clearInterval(fade); if (done) done(); }
    }, 30);
  }

  // deja la canción cargada en el punto de arranque
  const cue = () => { if (!playing) audio.currentTime = INICIO; };
  if (audio.readyState >= 1) cue(); else audio.addEventListener("loadedmetadata", cue, { once: true });

  function start() {
    playing = true;
    audio.currentTime = INICIO;
    audio.volume = 0;
    audio.play().catch(() => {});
    ramp(1, 1000);
  }
  function stop() {
    playing = false;
    ramp(0, 1500, () => audio.pause());
  }
  function pause(p) {
    if (p) audio.pause();
    else if (playing) audio.play().catch(() => {});
  }
  function toggleMute() { return audio.muted = !audio.muted; }
  // al empezar cada escena: si la canción se desfasó (carga lenta, saltar escena), la reacomoda
  function sync(sec) {
    if (playing && Math.abs(audio.currentTime - INICIO - sec) > .35) audio.currentTime = INICIO + sec;
  }
  return { start, stop, pause, toggleMute, sync };
})();
