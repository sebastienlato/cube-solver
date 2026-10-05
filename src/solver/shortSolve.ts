/**
 * Exact search for cubes that are only a few turns from solved.
 *
 * cubejs returns the first two-phase solution it finds, which for a cube one turn from
 * solved can be 8–15 moves long. Meeting in the middle fixes that: a table of every position
 * within TABLE_DEPTH turns of solved, plus a shallow search from the scrambled side, finds
 * the shortest solution for anything up to TABLE_DEPTH + SEARCH_DEPTH turns away.
 */
import { OPPOSITE, SOLVED, faceIndex, type Face } from '../cube/facelets'
import { ALL_MOVES, invertMove, type Move } from '../cube/moves'
import { applyMove } from '../cube/state'

const TABLE_DEPTH = 4
const SEARCH_DEPTH = 3

/** Longest solution this search is guaranteed to find. */
export const SHORT_SOLUTION_LIMIT = TABLE_DEPTH + SEARCH_DEPTH

/**
 * Skips sequences that repeat a face, and fixes the order of two opposite faces (they
 * commute), so each position is reached by far fewer equivalent paths.
 */
function follows(previous: Move | undefined, next: Move): boolean {
  if (!previous) return true
  const a = previous[0] as Face
  const b = next[0] as Face
  if (a === b) return false
  return !(OPPOSITE[a] === b && faceIndex(a) > faceIndex(b))
}

/** For each position near solved: the moves that reach it from solved. */
let nearSolved: Map<string, Move[]> | null = null

function buildTable(): Map<string, Move[]> {
  const table = new Map<string, Move[]>([[SOLVED, []]])
  let frontier: [string, Move[]][] = [[SOLVED, []]]
  for (let depth = 0; depth < TABLE_DEPTH; depth++) {
    const next: [string, Move[]][] = []
    for (const [state, path] of frontier) {
      for (const move of ALL_MOVES) {
        if (!follows(path[path.length - 1], move)) continue
        const reached = applyMove(state, move)
        if (table.has(reached)) continue
        const reachedPath = [...path, move]
        table.set(reached, reachedPath)
        next.push([reached, reachedPath])
      }
    }
    frontier = next
  }
  return table
}

export function prepareShortSolver(): void {
  nearSolved ??= buildTable()
}

/** The shortest solution if the cube is at most SHORT_SOLUTION_LIMIT turns from solved, else null. */
export function findShortSolution(state: string): Move[] | null {
  prepareShortSolver()
  const table = nearSolved!
  let best: Move[] | null = null

  const search = (current: string, path: Move[], remaining: number) => {
    if (remaining === 0) {
      const fromSolved = table.get(current)
      if (fromSolved && (!best || path.length + fromSolved.length < best.length)) {
        best = [...path, ...[...fromSolved].reverse().map(invertMove)]
      }
      return
    }
    for (const move of ALL_MOVES) {
      if (follows(path[path.length - 1], move)) search(applyMove(current, move), [...path, move], remaining - 1)
    }
  }

  // Deeper searches can only find longer solutions, so stop once one can't be beaten.
  for (let depth = 0; depth <= SEARCH_DEPTH; depth++) {
    if (best !== null && (best as Move[]).length <= depth) break
    search(state, [], depth)
  }
  return best
}
