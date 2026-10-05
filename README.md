# Cube Solver

A website that solves a real 3×3×3 Rubik's cube. Take two photos of the cube (two opposite corners, three faces each), check the colors it read, press **Solve**, and follow the moves on an animated 3D cube.

Everything runs in the browser. There is no backend and no account, photos never leave the device, and the app works offline after the first visit.

**Live site: <https://sebastienlato.github.io/cube-solver/>**

- Full requirements: [SPEC.md](SPEC.md)
- Design plan: [DESIGN.md](DESIGN.md)
- Judgment calls made while building: [DECISIONS.md](DECISIONS.md)

## Run it

Needs Node.js 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (normally `http://localhost:5173`).

| Command              | What it does                                                                        |
| -------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`        | Development server                                                                  |
| `npm run build`      | Type-check, then build the production site into `dist/`                             |
| `npm run preview`    | Serve the built site locally                                                        |
| `npm run typecheck`  | TypeScript, strict mode                                                             |
| `npm run lint`       | ESLint, including accessibility rules                                               |
| `npm test`           | Unit tests (Vitest), about 45 seconds                                               |
| `npm run e2e`        | Builds, then runs the end-to-end tests (Playwright) and rewrites `e2e/screenshots/` |
| `npm run lighthouse` | Lighthouse (mobile) against the built site; run `npm run build` first               |
| `npm run format`     | Prettier                                                                            |

The first `npm run e2e` on a new machine may need `npx playwright install chromium`.

## Try it with your own cube

On a computer, `npm run dev` and use **Upload photo**, or allow the webcam.

On a phone, the live camera only works on a secure page, so either:

- deploy the site (below) and open it on the phone, or
- run `npm run dev -- --host`, open the network address on the phone, and use **Upload photo**. That button opens the phone's own camera and works over plain HTTP.

Then:

1. **Photo 1.** Hold the cube so one corner points at the camera and you see three faces: one on top, one on the left, one on the right.
2. **Adjust.** Drag the seven dots to the corners of the cube until each square of the grid sits on one sticker.
3. **Photo 2.** Turn the cube upside down and photograph the opposite corner. Any of its three faces can be on top.
4. **Review.** Compare the unfolded cube on screen with yours. Tap a sticker to fix it. Ringed stickers are the ones the app was least sure of.
5. **Solve.** Hold the cube as the screen says (for example "white on top, green facing you") and step through the moves.

Ordinary room light is fine. Avoid a lamp reflecting straight off the stickers.

No cube to hand? **Try a random scramble** on the home screen shows the solver and the 3D playback, and **Enter colors manually** skips the camera.

## How scanning works

1. **Geometry.** A photo of a cube corner is a hexagon with seven key points. The handles give those points; each visible face is a quadrilateral, and a homography (a 4-point perspective map, solved with a small Gaussian elimination) finds the center of each of its nine stickers.
2. **Sampling.** For each sticker the app reads a grid of pixels from the middle of the cell and takes the per-channel median in linear light, which ignores small highlights and the black borders.
3. **White balance.** Each photo is normalized on its own, using its white stickers as the reference. A photo with no white sticker borrows the other photo's correction.
4. **Classification.** The six center stickers define the six colors. The other 48 are assigned so that every color gets exactly eight (a min-cost assignment by the Hungarian algorithm), comparing colors by CIEDE2000 with brightness removed, so a sticker in shade matches the same color in light. The assignment repeats three times, each time re-centering every color on its members.
5. **Mapping to the cube.** Which cell of which photo is which facelet is not a lookup table: it is computed by rotating a 3D model of the cube in front of a virtual camera. Photo 2 could have been held three ways; the app tries all three and keeps the one that forms a real cube.
6. **Validation.** The result is checked piece by piece (every edge and corner real, present once, correctly twisted) and any problem is described in plain words.

The solver is `cubejs` (Kociemba's two-phase algorithm) running in a Web Worker, with a small exact search in front of it so that a cube a few turns from solved gets the shortest answer.

## Deploy

The build is a folder of static files.

```bash
npm run build
```

This repository deploys itself: every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages.

To host it elsewhere, upload `dist/` to any static host: Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, or your own server. Asset paths are relative and routes live in the URL hash, so it works from any folder with no server configuration. Hosts that serve over HTTPS (all of the above) also enable the live camera.

## Project layout

```
src/
  cube/      Facelet indexing, 3D sticker geometry, moves, scrambles, piece-level validation, editing
  vision/    Homography, sampling, color math, white balance, balanced classification,
             photo → facelet mapping, the scan pipeline, photo quality checks
  solver/    cubejs wrapper, short-solution search, Web Worker and its client
  three/     The 3D cube and the playback state machine
  ui/        Screens, components, session store, hash router
  test/      Synthetic photo renderer used by the vision tests and the e2e upload test
e2e/         Playwright specs, synthetic photo files, screenshots
scripts/     Lighthouse runner
```

Cube state is always a 54-character facelet string in URFDLB order. Everything in `cube/`, `vision/` and `solver/` (apart from the worker shell) is pure TypeScript with no React or DOM imports.

## Tests

**Unit (132 tests)**

- Moves: every move four times is the identity, `R U R' U'` six times is the identity, and 300 random sequences agree with `cubejs`.
- Validator: one test per error type, each asserting the exact message.
- Solver: 500 random scrambles solved and replayed with the app's own move engine, every solution at most 24 moves.
- Vision round trip: 200 random cubes × 3 ways of holding photo 2, rendered as synthetic photos with perspective, borders, noise, a per-photo color cast, uneven face lighting, a soft sheen and small highlights. The recovered cube equals the original 600 times out of 600, and again with every handle nudged by up to 4 px.
- Also: nearly solved cubes, a logo on the white center, one photo much darker than the other, an unsolvable cube, a repeated corner in any of 21 poses, and two centers that look alike.

**End to end (52 tests)** against the production build:

- Demo scramble plays to the end and the 3D cube ends solved.
- Manual entry of a full cube, then solve.
- Upload of two synthetic photos → review → solve, asserting that no request leaves the origin.
- Live camera (Chromium's fake camera): guide, capture, handles placed where the guide was.
- The Solution screen fits 390×844 with no scrolling at start, mid-solution and solved.
- Back navigation, refresh survival, reduced motion, offline, no-WebGL fallback, camera refusal, dark photo, repeated corner.
- Screenshots of every screen at 390×844 and 1440×900 in light and dark, saved to `e2e/screenshots/`.

## Lighthouse

Measured on the production build with Lighthouse 13.5, mobile emulation, on 5 October 2026 (`npm run build && npm run lighthouse`).

| Page                        | Performance | Accessibility | Best Practices |
| --------------------------- | ----------- | ------------- | -------------- |
| Home (`/`)                  | 98          | 100           | 100            |
| Manual entry (`/#/manual`)  | 98          | 100           | 100            |
| Scan, photo 1 (`/#/scan/1`) | 92          | 100           | 100            |

Targets were 90 / 95 / 95. Home scored 98 or 99 on every one of several runs. The very first run on a cold machine can score lower on Performance, because the browser has not yet compiled the 3D shaders; run it twice.

## Privacy and offline

- Photos are decoded, displayed and analyzed in the page. They are held in memory only and are gone when the tab closes. Nothing is uploaded; an end-to-end test fails if any request goes to another origin.
- The cube's colors and your playback speed are kept in `sessionStorage` so a refresh doesn't lose them. Photos are never stored.
- A service worker caches the whole app (about 1.2 MB) on the first visit. After that it opens and solves with no connection.
- Fonts are bundled. No analytics, no third-party requests.

## Known limitations

- **Tuned on synthetic photos only.** No real cube photos were available during the build, so color detection has not been tuned against a real camera. Expect to fix a few stickers in Review under difficult light, especially red against orange. To tune it, put pairs of real photos in `test-photos/` and follow SPEC.md section 6.6.
- **Handles are placed by hand.** The app does not find the cube in the photo; you drag seven dots.
- **Glare.** A reflection that washes out a whole sticker cannot be recovered from color. Retake the photo.
- **Unusual cubes.** Any six distinct colors work, but messages name them with the nearest of white, yellow, red, orange, green and blue. Two colors that look nearly the same are reported as a problem.
- **Symmetric positions.** For a solved cube, or a pattern that looks the same when the hidden half is turned, the photos alone can't tell which way photo 2 was held. The app assumes the cube was turned upside down.
- **Solution length.** Solutions are usually 19 to 22 moves, not the shortest possible. Cubes within 7 moves of solved do get the shortest answer.
- **Browsers.** Tested in Chromium. It uses current CSS (`dvh`, `:has()`), so it needs a browser from 2023 or later. Safari and Firefox have not been checked on real devices.
- **Phone held sideways.** The Solution and Adjust screens scroll instead of fitting exactly.
- **Live camera needs HTTPS** (or `localhost`). Upload works everywhere.

## Easy next steps

- Tune color detection on real photos (first priority).
- Snap the handles to the cube's edges automatically, starting from the guide.
- Share a cube as a link: the 54-character state fits in the URL.
- Keep a history of solved cubes in local storage.
