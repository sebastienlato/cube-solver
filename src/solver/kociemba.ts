/**
 * Thin wrapper around cubejs (Kociemba two-phase). Kept free of worker and DOM code so the
 * same function runs in the Web Worker and in the Node unit tests.
 *
 * cubejs reads and writes the same URFDLB facelet string as the rest of the app
 * (see `Cube.fromString` / `asString` in node_modules/cubejs/lib/cube.js), so no conversion is needed.
 */
import Cube from 'cubejs'
import { SOLVED } from '../cube/facelets'
import { parseAlg, type Move } from '../cube/moves'
import { validate } from '../cube/validate'
import { findShortSolution, prepareShortSolver } from './shortSolve'

/** cubejs searches up to this depth and returns the first solution it finds. */
export const MAX_SOLUTION_LENGTH = 22

let tablesReady = false

/** Builds the move and pruning tables. Takes a few seconds, so call it ahead of time. */
export function initSolver(): void {
  if (tablesReady) return
  Cube.initSolver()
  prepareShortSolver()
  tablesReady = true
}

export function solve(facelets: string): Move[] {
  // cubejs returns a malformed string for a solved cube and may not terminate on an impossible one.
  if (facelets === SOLVED) return []
  const check = validate(facelets)
  if (!check.valid) throw new Error(check.issues[0].message)
  initSolver()
  return findShortSolution(facelets) ?? parseAlg(Cube.fromString(facelets).solve(MAX_SOLUTION_LENGTH))
}
