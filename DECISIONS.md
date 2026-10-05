# Decisions

One line each: the decision, then the reason.

- Kept the kickoff package README as `KICKOFF_README.md` and wrote a new project `README.md`: the definition of done needs a project README and the original should not be lost.
- TypeScript 6.0 instead of 7.x, ESLint 9 instead of 10: `typescript-eslint` supports TypeScript below 6.1 and `eslint-plugin-jsx-a11y` supports ESLint up to 9.
- `three` pinned to 0.173: the newest release line that `@react-three/fiber` 8 and `drei` 9 (the React 18 lines) were published against.
- Tailwind 4 through `@tailwindcss/vite`, tokens as CSS variables in `src/index.css`: one place defines light and dark values, so components never need `dark:` variants.
- E2E runs against `vite preview` of the production build: the service worker, offline mode and code splitting only exist there.
