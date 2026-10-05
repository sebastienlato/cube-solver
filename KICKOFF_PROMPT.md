# Kickoff prompt

Copy everything below the line into Claude Code.

---

Build the complete app described in `SPEC.md`, following the rules in `CLAUDE.md`. Read both files fully before writing any code.

Work autonomously from start to finish. I want minimal involvement:

- Do not ask me questions. When something is ambiguous, pick the option that best serves the spec's goals, record it in `DECISIONS.md` (one line: decision + reason), and keep going.
- Work through the milestones in SPEC.md section 13 in order. Use a todo list to track them.
- After each milestone: run typecheck, lint, unit tests and the production build. Fix every failure before moving on. Then make a git commit named after the milestone.
- If an approach fails twice (a library doesn't work, a test keeps failing for a structural reason), step back, choose a different approach, log it in `DECISIONS.md`, and continue. Don't stop and wait for me.
- Verify your own work in a real browser with Playwright: take screenshots at 390×844 (phone) and 1440×900 (desktop) of every screen, look at them, and fix anything that looks broken, cramped, misaligned or unpolished. Repeat until you would be proud to show it.
- If a `test-photos/` folder exists, use those real photos to tune and test the color detection (SPEC.md section 6.6).

You are done only when every item in the Definition of Done (SPEC.md section 14) is checked. Then give me a short final report: what was built, how to run it, how to test it with my real cube, any known limitations, and the list from `DECISIONS.md`.
