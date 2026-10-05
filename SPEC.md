# SPEC.md — Cube Solver

## 1. Product summary

A modern, mobile-first website that solves a real Rubik's cube (3×3×3).

1. The user takes **two photos** of their cube. Each photo shows one corner of the cube, so three faces are visible per photo. Two opposite corners cover all six faces.
2. The app detects all 54 sticker colors and shows them for review. The user can tap any sticker to correct it.
3. The user presses **Solve**. The app computes a short solution (typically 18–22 moves).
4. A **3D cube** shows the user's actual scrambled cube and animates the solution move by move, with plain-language instructions and playback controls.

The app must also be fully usable without a camera (photo upload, or manual color entry) and must work offline after first load. Everything runs in the browser.

Target users: casual cube owners who can't solve their cube, on a phone, in ordinary indoor light.

## 2. User flow and screens

### 2.1 Home
- The 3D cube is the hero: a slowly idling scrambled cube the user can drag to spin.
- One primary action: **Scan my cube**. Secondary actions: **Enter colors manually** and **Try a random scramble** (demo mode that skips scanning).
- A short, three-step explanation of how it works (this is a genuine sequence, so numbering is appropriate).

### 2.2 Photo 1 and Photo 2
- Instruction for photo 1: hold the cube so you look straight at one corner, with three faces visible: one on top, one on the left, one on the right. Fill the guide.
- Instruction for photo 2: turn the cube upside down and look at the opposite corner, the one with the three faces you couldn't see. Any of the three faces may be on top; the app figures it out.
- Each step shows a small animated 3D illustration of how to hold the cube (rendered with the same cube component, not an image).
- **Live camera mode** (when `getUserMedia` is available and the page is a secure context): full-bleed rear-camera preview with a hexagon guide overlay showing the outline of the cube corner and the 3×3 grids on each face. Buttons: **Take photo**, and a switch-camera button if more than one camera exists.
- **Upload mode** (always available): `<input type="file" accept="image/*" capture="environment">`. This also works on phones over plain HTTP because it opens the native camera.
- After either capture, go to **Adjust**: the photo is shown with 7 draggable handles (see 6.2) pre-placed where the guide was (or at a sensible default for uploads). The 3×3 grids are drawn live over the photo as the handles move, so the user can line them up with the stickers. A magnifier loupe appears near the finger while dragging on touch devices. Buttons: **Looks right** and **Retake**.
- A step indicator shows progress: Photo 1 → Photo 2 → Review → Solve.

### 2.3 Review
- Shows the detected cube as a flat net (cross layout) and simultaneously on the 3D cube.
- Low-confidence stickers (see 6.5) are marked with a subtle ring so the user knows where to look.
- Tapping a sticker opens a 6-color picker (the six center colors). Centers cannot be edited.
- Live validation message (see section 7) describing exactly what's wrong, for example "There are 10 white stickers and 8 yellow. One white sticker is probably yellow." Tapping the message highlights the likely culprits where the validator can identify them.
- **Solve** is enabled only when the cube is valid.

### 2.4 Manual entry
Same editor as Review, starting from a solved cube in the default color scheme, with the six centers editable here (and only here) to match the user's cube.

### 2.5 Solution
- Before the first move, tell the user exactly how to hold the cube: "Hold the cube with the **[color]** center on top and the **[color]** center facing you." The 3D view shows this orientation, and the camera of the 3D view is locked to the matching viewpoint by default.
- Playback controls: play/pause, previous move, next move, restart, speed (0.5×, 1×, 2×). Keyboard: Space = play/pause, ←/→ = step.
- A horizontal strip of move chips in standard notation (R, U', F2…) with the current move highlighted; tapping a chip jumps to that state.
- A plain-language line for the current move, for example "Turn the right face clockwise, as if you were looking straight at it" and "Turn the top face twice".
- Move counter ("Move 7 of 20"). On completion, a short, single celebration moment and the option to **Scan another cube**.
- The user can orbit the 3D view freely with a **Reset view** button.

## 3. Tech stack

As fixed in `CLAUDE.md`: Vite, React, TypeScript strict, `@react-three/fiber` + `drei`, Tailwind, `cubejs` in a Web Worker, Vitest, Playwright, `@fontsource` fonts. No backend.

Do not add OpenCV.js. The vision pipeline is simple enough to implement in plain TypeScript (homography + sampling + color math), which keeps the bundle small and the code testable.

## 4. Suggested structure

```
src/
  cube/        facelets.ts (types, constants, URFDLB indexing), state.ts (apply moves, solved state, scramble),
               validate.ts (piece-level validation), moves.ts (notation parsing, plain-language descriptions),
               geometry.ts (3D sticker positions, rotations used by the vision mapping)
  vision/      homography.ts, sample.ts, color.ts (sRGB→Lab, CIEDE2000, white balance),
               classify.ts (balanced assignment), views.ts (photo-cell → facelet mapping), pipeline.ts
  solver/      solver.worker.ts, solverClient.ts
  three/       Cube3D.tsx (cubies, stickers, move animation), Playback.ts
  ui/          screens/, components/, design tokens
  test/        synthetic image renderer used by vision tests
e2e/           Playwright specs and screenshot runs
```

## 5. Cube model and notation

- Cube state is a 54-character facelet string in **URFDLB** order, as used by Kociemba and `cubejs`: positions 0–8 are U1–U9, 9–17 R1–R9, 18–26 F1–F9, 27–35 D1–D9, 36–44 L1–L9, 45–53 B1–B9. Each character is the face letter whose center color that sticker matches.
- Facelet numbering per face (row by row, 1–9):
  - U viewed from above, with B at the top edge and F at the bottom edge.
  - R, F, L, B viewed straight on with U at the top edge.
  - D viewed from below, with F at the top edge and B at the bottom edge.
- Colors are stored separately as a map from face letter to the measured center color, so the solver never depends on a particular color scheme.
- Implement `applyMove(state, move)` for U, R, F, D, L, B with ', 2 suffixes. This is used for tests, playback state, and scrambles. Unit test it against known identities (e.g. `R U R' U'` six times = solved; each move four times = solved; `cubejs` agrees with your implementation on random sequences).

## 6. Vision pipeline

This is the hardest and most important part. Build it as pure functions and test it with synthetic images before touching camera UI.

### 6.1 Photo geometry
A photo of a cube corner shows a hexagon. Name its 7 key points:

- `C` the near corner (the hexagon's middle point, where the three visible faces meet)
- `T` top vertex, `TR` upper-right, `BR` lower-right, `B` bottom, `BL` lower-left, `TL` upper-left

The three visible faces are quadrilaterals:

- top face: `T, TR, C, TL`
- left face: `TL, C, B, BL`
- right face: `C, TR, BR, B`

### 6.2 Handles and rectification
The user-adjusted handles provide these 7 points. For each face quadrilateral, compute a homography from the unit square to the quad (4-point DLT, solved with a small Gaussian elimination; no library). Sticker centers are at unit coordinates ((i + 0.5)/3, (j + 0.5)/3). Draw the grid lines from the same homography so what the user sees is exactly what gets sampled.

### 6.3 Sampling
For each sticker, sample a patch covering the inner ~40% of the cell (avoids black borders and edges), at the photo's full resolution. Take the per-channel median in linear RGB to reject glare and shadows. Cap the processing resolution so it runs in well under a second on a mid-range phone.

### 6.4 Mapping photo cells to facelets
Do not hand-write lookup tables for photo 2. Instead:

1. In `cube/geometry.ts`, give each of the 54 facelets a 3D position and normal on a unit cube in the standard orientation (U = +y, R = +x, F = +z).
2. Define the camera view for photo 1 as looking at the U-F-R corner with U on top, F on the left and R on the right. Project each visible facelet, and assign it to the face quadrilateral and 3×3 cell it lands in. This produces the photo-1 cell→facelet table automatically.
   For reference, the result must satisfy: top quad = U with U1 at `T`, U3 at `TR`, U7 at `TL`, U9 at `C`; left quad = F with F1 at `TL`, F3 at `C`, F7 at `BL`, F9 at `B`; right quad = R with R1 at `C`, R3 at `TR`, R7 at `B`, R9 at `BR`. Write a unit test asserting exactly this.
3. Photo 2 shows the opposite corner (D, B, L). A physically possible hold has three variants, depending on which of D, B, L is on top; the left/right faces follow from handedness. Generate all three via rigid rotations of the 3D model (never mirror images) and derive their tables the same way.
4. The pipeline tries all three photo-2 variants and keeps the one that produces a valid cube (section 7). If none is valid, keep the variant with the fewest validation errors and send the user to Review. If more than one is valid (very unlikely), prefer the one with the higher total classification confidence.

### 6.5 Color classification
Lighting differs between the two photos and red/orange and white/yellow are easy to confuse, so:

1. Convert samples to CIELAB (D65).
2. Per-photo normalization: estimate each photo's white balance from its 27 samples (for example, scale so the brightest low-chroma samples become neutral; fall back to gray-world if no near-neutral stickers exist) and apply it before comparing across photos. Log the chosen method in `DECISIONS.md`.
3. The six center stickers are the anchors and define the six classes. Centers are fixed and must be six distinct classes; if two centers look like the same color, show that as a specific error.
4. Classify the remaining 48 stickers with a **balanced assignment**: exactly 8 non-center stickers per class. Solve it as a min-cost assignment (Hungarian algorithm on a 48×48 cost matrix with each class repeated 8 times), cost = CIEDE2000 distance to the class prototype. Then update each prototype to the mean of its members and repeat the assignment 2–3 times.
5. Confidence per sticker = gap between its assigned-class distance and its second-best distance. Mark the lowest-confidence stickers (below a tuned threshold) in Review.

### 6.6 Testing the pipeline
- **Synthetic round-trip test (required):** write a test renderer that, given a cube state, draws the two corner views into an `ImageData`-like RGBA buffer with perspective, black borders between stickers, slight noise, a mild per-photo color cast and a soft glare spot. Feed the buffers and the true 7 handle points through the pipeline. For 200 random valid cube states and all three photo-2 variants, the recovered state must equal the original 100% of the time. Also test with handle points perturbed by a few pixels.
- **Real photos (if `test-photos/` exists):** run the pipeline on each pair with handle points you locate once by inspecting the images, record them in a fixture file, and assert the result is a valid cube. Use failures to tune normalization and thresholds.

## 7. Validation

Validate at the piece level, not just by color counts, and produce specific human-readable messages:

1. Exactly 9 stickers of each color, six distinct centers.
2. Every edge is a real edge piece (two colors that are not the same and not opposite) and appears exactly once.
3. Every corner is a real corner piece with correct chirality and appears exactly once.
4. Corner twist sum ≡ 0 (mod 3). Edge flip sum ≡ 0 (mod 2). Corner and edge permutation parities match.

Opposite pairs are derived from the centers' faces (U–D, R–L, F–B), never assumed from a color scheme. Where possible, messages point at the likely stickers (e.g. the two stickers of a duplicated edge). Parity-type errors get a friendly explanation ("This position can't be reached by turning the cube; one piece may have been reassembled or a sticker misread").

## 8. Solver

- Run `cubejs` in a Web Worker. Call its solver initialization when the app loads (it takes a few seconds), so it's ready by the time scanning finishes. Show a quiet "Preparing solver" state only if the user reaches Solve before it's ready.
- Verify the `cubejs` API against the installed package source (facelet string input and solve output). If its facelet input differs from section 5, convert at the boundary and test it. If `cubejs` is unusable, use another browser-compatible Kociemba two-phase implementation and log why.
- Solver round-trip test: for 500 random scrambles, applying the returned solution with your own `applyMove` produces the solved state, and solutions are at most 24 moves.
- Already-solved cube: show a friendly "Your cube is already solved" state instead of an empty solution.

## 9. 3D cube

- 26 visible cubies with slightly rounded black bodies and inset rounded stickers, colored from the measured center colors (lightly normalized so they look clean, not muddy).
- Move animation: attach the 9 cubies of the turning layer to a pivot, rotate with an ease-in-out curve, then bake the transform and reattach. Durations scale with the speed setting. Under `prefers-reduced-motion`, moves complete instantly with a brief highlight instead.
- Must stay at 60 fps on a mid-range phone: shared geometries and materials, no shadows heavier than a soft contact shadow, `dpr` capped at 2.
- The same component is used for the Home hero, the how-to-hold illustrations, Review and Solution.

## 10. Design direction

Follow the frontend-design approach: write a compact design plan first (4–6 named colors, typefaces and their roles, layout sketches, principles), critique it against generic AI-looking defaults, revise, then build. Save the plan in `DESIGN.md`.

Direction to start from:

- **The cube is the one bold, memorable element.** Everything around it is quiet, precise and disciplined, like a well-lit product photo of a single object.
- The six sticker colors are functional: they appear on the cube, the net and the color picker, and nowhere as decoration. The UI chrome uses a restrained neutral palette with a single accent chosen to not clash with any sticker color.
- Avoid the common generated-site defaults: cream-and-terracotta, near-black with one acid accent, identical rounded cards with grey drop shadows, all-caps eyebrow labels, arrows appended to button text, gradient washes.
- Pick typefaces deliberately (self-hosted). A clear type scale. Move notation (R, U', F2) is shown large and legible, since it's the most-read text in the app.
- Mobile first: the Solution screen must fit on a 390×844 phone with the cube large, controls reachable with a thumb, no page scroll needed. On desktop, use a two-column layout (cube | steps).
- Motion: one orchestrated moment on Home (the cube settling in), and motion that responds to user actions. Nothing else animates on its own.
- Light and dark themes following the system setting.
- Copy: short, plain, specific. Errors explain what happened and how to fix it.

## 11. Edge cases

- Camera permission denied or unavailable → switch to upload mode with a one-line explanation.
- Photo too dark or very low contrast → warn on Adjust, allow continuing.
- User takes photo 2 of the same corner as photo 1 → detected because centers repeat; explain and offer Retake.
- Very large photos → downscale for processing, keep the original only in memory.
- Navigating back from any step keeps prior photos and edits.
- State survives a page refresh during a session (sessionStorage for the facelet string and settings; never store photos).

## 12. Performance, privacy, offline

- Lighthouse on the production build (mobile): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
- Code-split the 3D and solver code so Home's first paint is fast.
- Add a minimal service worker (e.g. `vite-plugin-pwa`) so the app works offline after the first visit.
- A one-line privacy note on the scan screen: photos are processed on your device and never uploaded. This must be true.

## 13. Milestones (in order; commit after each)

- **M0 Scaffold:** Vite + React + TS + Tailwind, ESLint, Vitest, Playwright, scripts, git, `DECISIONS.md`.
- **M1 Cube core:** facelets, moves, scramble, validator, solver worker, all tests in sections 5, 7 and 8.
- **M2 3D cube:** Cube3D with move animation and playback; Solution screen working with **Try a random scramble**.
- **M3 Manual entry and Review editor:** full working path without any camera.
- **M4 Vision core:** homography, sampling, color, balanced classification, view mapping, synthetic renderer, round-trip tests passing at 100%.
- **M5 Capture UI:** live camera with guide, upload fallback, Adjust handles with loupe, wiring into Review. Tune on `test-photos/` if present.
- **M6 Design and polish:** design plan, full visual pass on every screen, light/dark, how-to-hold animations, empty and error states, accessibility, reduced motion. Screenshot review loop at phone and desktop sizes.
- **M7 Hardening:** PWA/offline, Lighthouse checks, e2e tests, project README, final report.

## 14. Definition of done

- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run e2e` all pass.
- [ ] Vision synthetic round-trip: 100% correct over 200 random cubes × 3 photo-2 variants, including perturbed handles.
- [ ] Solver round-trip: 500 random scrambles solved, all solutions ≤ 24 moves.
- [ ] Validator unit tests cover each error type in section 7 with a specific message.
- [ ] E2E: demo scramble → solution plays to the end and the 3D cube ends solved; manual entry → solve; upload of two synthetic photos → review → solve.
- [ ] Screenshots of every screen at 390×844 and 1440×900, light and dark, reviewed and polished; saved in `e2e/screenshots/`.
- [ ] Solution screen fits a 390×844 viewport without scrolling.
- [ ] Lighthouse targets in section 12 met on the production build (record scores in the README).
- [ ] Works offline after first load.
- [ ] Project `README.md`: what it is, how to run, how to deploy (static hosting), how scanning works, known limitations.
- [ ] `DESIGN.md` and `DECISIONS.md` present and up to date.

## 15. Out of scope

Automatic cube detection without handles (may be added later), cubes other than 3×3×3, accounts, saving history, sharing, a backend, solving methods taught step by step (beginner method). Note any of these that would be easy follow-ups in the final report.
