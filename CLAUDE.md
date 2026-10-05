# CLAUDE.md — Cube Solver

A static web app: the user photographs a Rubik's cube twice (two opposite corners, three faces per photo), confirms the detected colors, presses Solve, and follows an animated 3D solution. Full requirements live in `SPEC.md`. That file is the source of truth; this file holds standing rules.

## Working style

- Work autonomously. Never block waiting for the user. Log judgment calls in `DECISIONS.md`.
- Small, focused modules. Pure logic (cube model, vision math, color classification, validation) has no React or DOM imports so it can be unit tested in Node.
- Test the hard logic first and thoroughly: the vision pipeline round-trip test and the solver round-trip test are the two most important tests in the project.
- Commit after each milestone with a clear message.

## Stack (fixed; don't substitute without logging why)

- Vite + React 18 + TypeScript (strict mode)
- Three.js via `@react-three/fiber` and `@react-three/drei`
- Tailwind CSS for styling
- `cubejs` (npm) for solving (Kociemba two-phase), run inside a Web Worker
- Vitest for unit tests, Playwright for end-to-end tests and screenshots
- Fonts self-hosted through `@fontsource/*` packages (no requests to Google Fonts)
- No backend, no accounts, no analytics. Everything runs in the browser. Photos never leave the device.

## Commands (create these scripts in package.json)

- `npm run dev` — dev server
- `npm run build` — typecheck + production build
- `npm run typecheck`
- `npm run lint`
- `npm test` — Vitest, run once
- `npm run e2e` — Playwright

## Code conventions

- Folder layout as in SPEC.md section 4.
- Cube state is always a 54-character facelet string in URFDLB order (SPEC.md section 5). Convert at the edges, never invent another internal format for the whole cube.
- No `any`. No unused code. Comments explain *why*, not *what*.
- All user-facing text in sentence case, plain language, active voice. Buttons say what they do ("Take photo", "Solve", "Retake").
- Accessibility floor: visible keyboard focus, labelled controls, `prefers-reduced-motion` respected, color is never the only signal (stickers in the editor also expose their color name to screen readers).
