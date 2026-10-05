import { useEffect } from 'react'
import { solverClient } from './solver/solverClient'
import { useRoute } from './ui/router'
import { EditorScreen } from './ui/screens/Editor'
import { HomeScreen } from './ui/screens/Home'
import { ScanScreen } from './ui/screens/Scan'
import { SolutionScreen } from './ui/screens/Solution'

// The screens are small and ship together. The two heavy parts load on their own: three.js
// when a 3D cube first appears (see CubeView), and the solver in its Web Worker.
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

  switch (route.name) {
    case 'solve':
      return <SolutionScreen />
    case 'manual':
    case 'review':
      return <EditorScreen key={route.name} mode={route.name} />
    case 'scan':
      return <ScanScreen photo={route.photo} stage={route.stage} />
    default:
      return <HomeScreen />
  }
}
