# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-page congratulations site for a graduate of the *Diplomado en Conciliación Extrajudicial en Derecho* (Centro de Conciliación y Arbitraje Corporación PESV). All UI text is in Spanish. Plain static files, no build step, package manager, linter or test suite:

```
index.html        markup + the GRADUADO data block at the top of <head>
css/estilos.css   all styles
js/*.js           classic scripts, loaded in this order at the end of <body>
img/foto.jpg      portrait, 4:5 (720×900)
img/diploma.jpg   diploma
music/cancion.mp3 intro soundtrack
```

Published on GitHub Pages from `main` (`origin` = `mariocodem/felicitaciones-pesv`), served at `https://mariocodem.github.io/felicitaciones-pesv/`. To preview locally, run any static server in the repo root, e.g. `python3 -m http.server` (opening the file directly also works).

## Changing the graduate

The page is reused for different graduates. A swap is:

1. `GRADUADO = { nombre, genero }` at the top of `index.html`. `genero` is `"masculino"` or `"femenino"` and drives every gendered word: HTML marks them as `<span data-g="masc|fem">`, JS uses `segunGenero(masc, fem)` (stole text, alt texts, seeded wall message). New gendered copy must use one of these, never hard-coded forms.
2. The same name in `og:title`, just below it. Link-preview crawlers don't run JS, so it can't come from `GRADUADO`; `js/textos.js` logs a console warning if they don't match.
3. Replace `img/foto.jpg` and `img/diploma.jpg`, keeping the file names. The portrait frame is 4:5 with `object-fit: cover`: crop wide photos to a vertical shot from the cap to just below the stole (ffmpeg is available; ImageMagick/PIL are not), ideally 720×900 so `og:image:width`/`height` stay right.

Everything else follows automatically: `[data-name]` elements, `document.title`, alt texts, the stole's embroidered text and `aria-label`, and the message wall's `localStorage` key (derived from the name, so each graduate gets an empty wall). The name can also be overridden per link with `?nombre=...`.

## Architecture

Scripts share globals (classic scripts, not modules), so load order matters:

- **`js/textos.js`**: applies `GRADUADO` to the page; defines `nombre` and `segunGenero()`.
- **`js/musica.js`** — **`Sound`**: plays `music/cancion.mp3` (the `<audio id="musica">` element) during the intro, fading in on start and out at the end; follows the film's pause and mute. `INICIO` is the song second the intro starts at, chosen so the song's big entry (56.1 s) lands on the name reveal (scene 5, 23.4 s into the film). `showScene()` calls `Sound.sync()` with each scene's start time, which reseeks if the song drifted more than 0.35 s (slow load, skipping scenes). Changing scene durations moves that alignment; swapping the song means re-picking `INICIO`. There are no other sound effects.
- **`js/efectos.js`**: confetti, fireworks, flying caps (`launchConfetti`, `launchFireworks`, `launchCaps`, `burst`) and the `reduceMotion` flag.
- **`js/intro.js`** — intro "film": `#film` contains `.scene` divs played in order. Each scene declares its timing and effects via data attributes: `data-duration` (ms) and flags `data-lights`, `data-flash`, `data-fireworks`, `data-confetti`, `data-caps`. `showScene()` reads these; adding a scene means adding markup with these attributes. Also the gold dust background, the player controls and the seal impact.
- **`js/estola.js`** — **`Stole`**: a cloth-physics simulation drawn on a `<canvas>` that falls and drapes around the investiture text, with embroidered letters (`LEFT`/`RIGHT`) that follow the cloth and auto-shrink to fit. It has been tuned for performance (no blur/filters, adaptive canvas resolution, `Math.sqrt` over `Math.hypot`) — keep it that way when editing. Inside it `g` is the canvas context, which is why the gender helper isn't called `g`.
- **`js/pagina.js`**: after the intro: diploma (with a file-input placeholder if the image is missing), lightbox for diploma and portrait, scroll reveals, and the message wall stored only in the visitor's browser.
- Respects `prefers-reduced-motion` (`reduceMotion` skips the intro and effects; a CSS media block disables animations).

## Conventions

Commit messages are in Spanish, with a short summary line and a bulleted body.
