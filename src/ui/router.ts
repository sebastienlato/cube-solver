import { useSyncExternalStore } from 'react'

/**
 * Hash routes, so the browser's back button steps through the flow and the app
 * can be hosted on any static server without rewrite rules.
 */
export type Route =
  | { name: 'home' }
  | { name: 'scan'; photo: 1 | 2; stage: 'capture' | 'adjust' }
  | { name: 'review' }
  | { name: 'manual' }
  | { name: 'solve' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] === 'scan' && (parts[1] === '1' || parts[1] === '2')) {
    return { name: 'scan', photo: parts[1] === '1' ? 1 : 2, stage: parts[2] === 'adjust' ? 'adjust' : 'capture' }
  }
  if (parts[0] === 'review' || parts[0] === 'manual' || parts[0] === 'solve') return { name: parts[0] }
  return { name: 'home' }
}

export function toHash(route: Route): string {
  if (route.name === 'home') return '#/'
  if (route.name === 'scan') return `#/scan/${route.photo}${route.stage === 'adjust' ? '/adjust' : ''}`
  return `#/${route.name}`
}

export function navigate(route: Route, options: { replace?: boolean } = {}): void {
  const hash = toHash(route)
  if (options.replace) {
    history.replaceState(null, '', hash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = hash
  }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export function useRoute(): Route {
  // The hash string is the snapshot so React can compare it by value.
  // The build prerenders the page with no hash, which is Home.
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  )
  return parseHash(hash)
}
