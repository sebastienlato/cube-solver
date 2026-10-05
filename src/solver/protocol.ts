import type { Move } from '../cube/moves'

export type SolverRequest = { type: 'init' } | { type: 'solve'; id: number; facelets: string }

export type SolverResponse =
  { type: 'ready' } | { type: 'solution'; id: number; moves: Move[] } | { type: 'error'; id: number; message: string }
