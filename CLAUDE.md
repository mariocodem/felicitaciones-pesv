# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-page congratulations site for a graduate of the *Diplomado en Conciliación Extrajudicial en Derecho* (Centro de Conciliación y Arbitraje Corporación PESV). All UI text is in Spanish. Everything — HTML, CSS and JS — lives in `index.html`; there is no build step, package manager, linter or test suite. Assets sit next to it: `graduada.jpg` (portrait) and `diploma.jpg`.

Published on GitHub Pages from `main` (`origin` = `mariocodem/felicitaciones-pesv`), served at `https://mariocodem.github.io/felicitaciones-pesv/`. To preview locally, run any static server in the repo root, e.g. `python3 -m http.server`.

## Changing the graduate

The page is reused for different graduates. A swap touches more than the name constant:

- `NOMBRE_POR_DEFECTO` in the config block at the top of the `<script>` (the name can also be overridden with `?nombre=...` in the URL; it fills every `[data-name]` element and `document.title`).
- Hard-coded copies of the name: `og:title`, the portrait `alt` texts (intro reveal scene and hero) and the diploma `alt`.
- Image files: portrait `src` (two places), the `<link rel="preload">`, `og:image` plus its `og:image:width`/`height`, and the diploma `src`. The portrait frame is 4:5 with `object-fit: cover`, so crop wide photos to a vertical upper-body shot (ffmpeg is available; ImageMagick/PIL are not).
- Grammatical gender throughout the copy (graduado/graduada, conciliador/conciliadora, listo/lista, the stole text `RIGHT` in the `Stole` module and its canvas `aria-label`, the seeded message in `iniciales`).
- The message wall's `localStorage` key (`KEY` in the MENSAJES block) — change it per graduate so earlier visitors don't see the previous graduate's messages.

## Architecture of `index.html`

- **Intro "film"**: `#film` contains `.scene` divs played in order. Each scene declares its timing and effects via data attributes: `data-duration` (ms), `data-cue` (music cue name passed to `Sound.cue`), and flags `data-lights`, `data-flash`, `data-fireworks`, `data-confetti`, `data-caps`. `showScene()` in the "INTRO TIPO VIDEO" block reads these; adding a scene means adding markup with these attributes and, if needed, a matching cue in `Sound`.
- **`Sound`**: ceremonial music synthesized with Web Audio (no audio files). Notes are scheduled shortly before they play rather than all at scene start, for performance.
- **`Stole`**: a cloth-physics simulation drawn on a `<canvas>` that falls and drapes around the investiture text, with embroidered letters (`LEFT`/`RIGHT`) that follow the cloth and auto-shrink to fit. It has been tuned for performance (no blur/filters, adaptive canvas resolution, `Math.sqrt` over `Math.hypot`) — keep it that way when editing.
- After the intro: hero (portrait + name), diploma section (with a file-input placeholder if the image is missing, and a lightbox), timeline, values, quote, and a message wall stored only in the visitor's browser.
- Respects `prefers-reduced-motion` (`reduceMotion` flag and a CSS media block).

## Conventions

Commit messages are in Spanish, with a short summary line and a bulleted body.
