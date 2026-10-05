# Decisions

One line each: the decision, then the reason.

- Kept the kickoff package README as `KICKOFF_README.md` and wrote a new project `README.md`: the definition of done needs a project README and the original should not be lost.
- TypeScript 6.0 instead of 7.x, ESLint 9 instead of 10: `typescript-eslint` supports TypeScript below 6.1 and `eslint-plugin-jsx-a11y` supports ESLint up to 9.
- `three` pinned to 0.173: the newest release line that `@react-three/fiber` 8 and `drei` 9 (the React 18 lines) were published against.
- Tailwind 4 through `@tailwindcss/vite`, tokens as CSS variables in `src/index.css`: one place defines light and dark values, so components never need `dark:` variants.
- E2E runs against `vite preview` of the production build: the service worker, offline mode and code splitting only exist there.
- Move permutations are derived by rotating the 3D sticker geometry instead of written as tables: one source of truth for moves, the 3D view and the photo mapping, and it is checked against cubejs.
- cubejs takes the same URFDLB facelet string as the spec (verified in `node_modules/cubejs/lib/cube.js` and by a 300-sequence agreement test), so there is no conversion at the solver boundary.
- A solved cube never reaches cubejs: `solve()` on the identity returns a malformed string, so the wrapper returns an empty solution and the UI shows "already solved".
- Added a small meet-in-the-middle search in front of cubejs for cubes up to 7 turns from solved: cubejs returns its first two-phase solution, which was 8–15 moves for a cube one turn from solved.
- cubejs search depth stays at its default of 22: depth 21 saves about one move but takes 5× longer on average, and depth 20 can take over a minute.
- Validator reports color counts first, then impossible and duplicated pieces, and checks twist, flip and parity only once every piece is real: those three are undefined otherwise, and counts are the easiest message to act on.
- Color names in messages are passed into the validator rather than assumed: the solver and validator work on face letters and never depend on a color scheme.
- A small Vite plugin rewrites cubejs's `.call(this)` wrapper to `.call({})`: in an ES module worker `this` is undefined and cubejs crashed on load; the rewrite sends it down its own CommonJS path with no change to the algorithm.
- The 3D cube "bakes" a finished turn by resetting the layer and repainting all stickers from the next facelet string, instead of reparenting meshes: the facelet string stays the only cube state, so jumping to any move is exact and nothing drifts.
- 3D lights ride with the camera and tone mapping is off: sticker colors are functional, so they should read the same from every angle and match the net and the picker.
- The contact shadow is a pre-drawn radial texture, not a rendered shadow pass: it costs nothing per frame on a phone.
- The current move shown is the one being turned (or the last one made), and the counter follows it: the readout then always describes the animation the user just watched and is copying on their own cube.
- Space toggles playback only when focus is not on a control: Space must keep activating the focused button for keyboard users.
