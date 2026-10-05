/**
 * The page's entry script, kept tiny on purpose. The production page arrives with Home
 * already drawn in the HTML, so the browser is given a frame to paint it before the app's
 * code is fetched and run. First paint then never waits on JavaScript.
 */
import './index.css'

const start = () => import('./main')

if (document.getElementById('root')?.hasChildNodes()) {
  requestAnimationFrame(() => setTimeout(start, 0))
} else {
  start()
}
