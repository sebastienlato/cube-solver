import { CORNERS, EDGES, FACES, OPPOSITE, SOLVED, centerIndex, type Face } from './facelets'
import { FACELET_GEOMETRY, FACE_NORMAL, dot, faceletAt, quarterTurn } from './geometry'
import { ALL_MOVES, parseMove, type Move } from './moves'

/**
 * For each face, `source[j]` is the facelet whose sticker ends up at `j` after one clockwise
 * turn. Derived by rotating the sticker geometry, so there is no hand-written table to get wrong.
 */
const QUARTER_TURN_SOURCE: Record<Face, number[]> = Object.fromEntries(
  FACES.map((face) => {
    const axis = FACE_NORMAL[face]
    const source = FACELET_GEOMETRY.map((g) => g.index)
    for (const g of FACELET_GEOMETRY) {
      if (dot(g.position, axis) !== 1) continue
      source[faceletAt(quarterTurn(g.position, axis), quarterTurn(g.normal, axis))] = g.index
    }
    return [face, source]
  }),
) as Record<Face, number[]>

const permute = (state: string, source: number[]): string => source.map((i) => state[i]).join('')

export function applyMove(state: string, move: Move): string {
  const { face, turns } = parseMove(move)
  let next = state
  for (let i = 0; i < turns; i++) next = permute(next, QUARTER_TURN_SOURCE[face])
  return next
}

export const applyMoves = (state: string, moves: Move[]): string => moves.reduce(applyMove, state)

export const isSolved = (state: string): boolean => state === SOLVED

/** Every state along a sequence: `states[i]` is the cube after `i` moves. */
export function statesAlong(start: string, moves: Move[]): string[] {
  const states = [start]
  for (const move of moves) states.push(applyMove(states[states.length - 1], move))
  return states
}

export type Rng = () => number

/** Small seedable generator so tests and demo scrambles are reproducible. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A scramble with no wasted turns: never the same face twice, never three turns on one axis. */
export function randomScramble(length: number, rng: Rng = Math.random): Move[] {
  const moves: Move[] = []
  while (moves.length < length) {
    const move = ALL_MOVES[Math.floor(rng() * ALL_MOVES.length)]
    const face = move[0] as Face
    const last = moves[moves.length - 1]?.[0] as Face | undefined
    const beforeLast = moves[moves.length - 2]?.[0] as Face | undefined
    if (face === last) continue
    if (last && OPPOSITE[face] === last && beforeLast === face) continue
    moves.push(move)
  }
  return moves
}

export interface Cubies {
  /** `cornerPiece[i]` is the piece sitting in corner position `i`. */
  cornerPiece: number[]
  /** Clockwise twists of the piece in position `i`, 0–2. */
  cornerTwist: number[]
  edgePiece: number[]
  /** 1 if the edge in position `i` is flipped. */
  edgeFlip: number[]
}

export function fromCubies({ cornerPiece, cornerTwist, edgePiece, edgeFlip }: Cubies): string {
  const out: string[] = new Array(54)
  for (const face of FACES) out[centerIndex(face)] = face
  CORNERS.forEach((pos, i) => {
    for (let n = 0; n < 3; n++) out[pos.facelets[(n + cornerTwist[i]) % 3]] = CORNERS[cornerPiece[i]].name[n]
  })
  EDGES.forEach((pos, i) => {
    for (let n = 0; n < 2; n++) out[pos.facelets[(n + edgeFlip[i]) % 2]] = EDGES[edgePiece[i]].name[n]
  })
  return out.join('')
}

/** Parity of a permutation: 0 for even, 1 for odd. */
export function permutationParity(permutation: number[]): number {
  const seen = new Array<boolean>(permutation.length).fill(false)
  let parity = 0
  for (let i = 0; i < permutation.length; i++) {
    if (seen[i]) continue
    let length = 0
    for (let j = i; !seen[j]; j = permutation[j]) {
      seen[j] = true
      length++
    }
    parity ^= (length - 1) & 1
  }
  return parity
}

function shuffled(count: number, rng: Rng): number[] {
  const items = Array.from({ length: count }, (_, i) => i)
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

/** A uniformly random solvable cube, drawn directly at the piece level. */
export function randomState(rng: Rng = Math.random): string {
  const cornerPiece = shuffled(8, rng)
  const edgePiece = shuffled(12, rng)
  if (permutationParity(cornerPiece) !== permutationParity(edgePiece)) {
    ;[edgePiece[0], edgePiece[1]] = [edgePiece[1], edgePiece[0]]
  }
  const cornerTwist = Array.from({ length: 7 }, () => Math.floor(rng() * 3))
  cornerTwist.push((3 - (cornerTwist.reduce((a, b) => a + b, 0) % 3)) % 3)
  const edgeFlip = Array.from({ length: 11 }, () => Math.floor(rng() * 2))
  edgeFlip.push(edgeFlip.reduce((a, b) => a + b, 0) % 2)
  return fromCubies({ cornerPiece, cornerTwist, edgePiece, edgeFlip })
}
