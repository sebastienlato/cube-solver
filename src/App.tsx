import { Suspense, lazy, useEffect } from 'react'
import { solverClient } from './solver/solverClient'
import { useRoute } from './ui/router'
import { HomeScreen } from './ui/screens/Home'

const SolutionScreen = lazy(() => import('./ui/screens/Solution').then((m) => ({ default: m.SolutionScreen })))

export function App() {
  const route = useRoute()

  useEffect(() => {
    // Building the solver tables takes a few seconds, so start once the first screen has settled.
    const timer = setTimeout(() => solverClient.warmUp(), 1500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.name])

  return (
    <Suspense fallback={null}>
      {route.name === 'solve' ? <SolutionScreen /> : <HomeScreen />}
    </Suspense>
  )
}
