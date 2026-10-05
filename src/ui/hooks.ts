import { useSyncExternalStore } from 'react'

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = (): boolean => useMediaQuery('(prefers-reduced-motion: reduce)')

/** True from the width where screens switch to their two-column layout. */
export const useWideLayout = (): boolean => useMediaQuery('(min-width: 1024px)')
