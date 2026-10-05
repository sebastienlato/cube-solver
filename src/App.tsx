import { Suspense, lazy, useEffect } from 'react'
import { solverClient } from './solver/solverClient'
import { useRoute } from './ui/router'
import { HomeScreen } from './ui/screens/Home'

const SolutionScreen = lazy(() => import('./ui/screens/Solution').then((m) => ({ default: m.SolutionScreen })))
const EditorScreen = lazy(() => import('./ui/screens/Editor').then((m) => ({ default: m.EditorScreen })))
const ScanScreen = lazy(() => import('./ui/screens/Scan').then((m) => ({ default: m.ScanScreen })))

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
      {route.name === 'solve' ? (
        <SolutionScreen />
      ) : route.name === 'manual' || route.name === 'review' ? (
        <EditorScreen key={route.name} mode={route.name} />
      ) : route.name === 'scan' ? (
        <ScanScreen photo={route.photo} stage={route.stage} />
      ) : (
        <HomeScreen />
      )}
    </Suspense>
  )
}
