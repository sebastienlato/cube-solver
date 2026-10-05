# Cube Solver — Claude Code kickoff package

This folder contains everything Claude Code needs to build the whole Rubik's cube scanner and 3D solver site in one run.

| File | What it is |
|---|---|
| `KICKOFF_PROMPT.md` | The prompt you paste into Claude Code to start. |
| `CLAUDE.md` | Standing rules Claude Code reads automatically every session (stack, conventions, autonomy rules). |
| `SPEC.md` | The full product and technical specification, including the photo-scanning math and the definition of done. |

## How to run it (about 5 minutes of your time)

1. Make a new empty folder, for example `cube-solver`, and copy `CLAUDE.md` and `SPEC.md` into it.
2. **Optional but very helpful:** create a subfolder `test-photos/` and put in 2–3 pairs of real photos of your own cube taken the way SPEC.md section 2 describes (`pair1-a.jpg`, `pair1-b.jpg`, `pair2-a.jpg`, …). Claude Code will tune the color detection against them. Without them it can only test on synthetic images.
3. Make sure Node.js 20 or newer is installed (`node -v`).
4. Open Claude Code in that folder.
5. To keep your involvement minimal, allow Claude Code to edit files and run commands without asking each time (accept-edits / auto mode in Claude Code's permission settings). If you leave approvals on, it will pause for you often.
6. Paste the contents of `KICKOFF_PROMPT.md` and press Enter.
7. Come back when it reports it's done. Then run `npm run dev -- --host`, open the site, and try it with your cube.

## What you'll still need to do yourself

Claude Code can build and test everything, but it can't hold your cube. At the end, do one real test with your cube under normal room light. If colors are misread, the review screen lets you tap to fix them, and you can send Claude Code the photos with a note like "red and orange get mixed up in these photos, tune the classifier" for a quick follow-up.

The phone camera only works over HTTPS (or on `localhost`). To use it on your phone, either deploy the built site (`npm run build`, then upload the `dist/` folder to Netlify, Vercel or GitHub Pages, all of which give HTTPS for free) or use the photo-upload button, which works everywhere.
