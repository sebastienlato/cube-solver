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
- The net is the horizontal cross (U above F, then L F R B, D below F): 12 stickers across leaves room for the 3D cube and the Solve button on one phone screen, where a taller layout would push them below the fold.
- Each center on the net carries its face letter (U, R, F…): it tells the user which face is which and teaches the notation the solution uses, without extra labels.
- Changing a center in manual entry swaps the two faces' colors and relabels the other stickers so they keep the color the user painted: six distinct centers are guaranteed, and nothing the user entered changes under them.
- Manual entry selects the next sticker after each pick; Review closes the picker instead: entering 48 stickers should take 48 taps, while Review fixes one or two.
- Low-confidence and "check this" stickers are marked with a ring in the accent color, never red: red is a sticker color, and the accent was chosen to clash with none of the six.
- Validation errors use an icon and plain text in the ink color rather than a warning color, for the same reason.
- "Start over" in manual entry asks once before clearing: it would otherwise throw away up to 48 taps with one slip.
