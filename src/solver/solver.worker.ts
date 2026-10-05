import { initSolver, solve } from './kociemba'
import type { SolverRequest, SolverResponse } from './protocol'

// Typed by hand because the DOM and WebWorker type libraries can't both be loaded.
interface WorkerScope {
  onmessage: ((event: MessageEvent<SolverRequest>) => void) | null
  postMessage(message: SolverResponse): void
}

const scope = self as unknown as WorkerScope

scope.onmessage = ({ data }) => {
  if (data.type === 'init') {
    initSolver()
    scope.postMessage({ type: 'ready' })
    return
  }
  try {
    scope.postMessage({ type: 'solution', id: data.id, moves: solve(data.facelets) })
  } catch (error) {
    scope.postMessage({ type: 'error', id: data.id, message: error instanceof Error ? error.message : String(error) })
  }
}
