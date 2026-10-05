import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import { parseHash } from './ui/router'

const root = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

// The production build ships with Home already rendered into the page (see vite.config.ts),
// so the first paint doesn't wait for JavaScript. Home picks that markup up; any other route
// replaces it. In development the root starts empty.
if (root.hasChildNodes() && parseHash(window.location.hash).name === 'home') {
  hydrateRoot(root, app)
} else {
  root.replaceChildren()
  createRoot(root).render(app)
}
delete document.documentElement.dataset.route
