import { FACES, FACE_WORD, isFace, type Face } from './facelets'

export type Move = `${Face}` | `${Face}'` | `${Face}2`

export interface ParsedMove {
  face: Face
  /** Clockwise quarter turns: 1 for R, 2 for R2, 3 for R'. */
  turns: 1 | 2 | 3
}

export const ALL_MOVES: Move[] = FACES.flatMap((f): Move[] => [f, `${f}2`, `${f}'`])

export function parseMove(move: string): ParsedMove {
  const face = move[0]
  const suffix = move.slice(1)
  if (!face || !isFace(face) || !['', "'", '2'].includes(suffix)) {
    throw new Error(`Not a move: "${move}"`)
  }
  return { face, turns: suffix === '' ? 1 : suffix === '2' ? 2 : 3 }
}

export const formatMove = ({ face, turns }: ParsedMove): Move =>
  turns === 1 ? face : turns === 2 ? `${face}2` : `${face}'`

/** Parses a space-separated sequence such as "R U R' U'". */
export function parseAlg(alg: string): Move[] {
  return alg
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => formatMove(parseMove(token)))
}

export function invertMove(move: Move): Move {
  const { face, turns } = parseMove(move)
  return formatMove({ face, turns: (4 - turns) as 1 | 2 | 3 })
}

export const invertAlg = (moves: Move[]): Move[] => [...moves].reverse().map(invertMove)

/** Notation for display, with a true prime mark, which reads more clearly than an apostrophe. */
export const displayMove = (move: Move): string => move.replace("'", '′')

/** How the notation is said aloud, for screen readers. */
export function spokenMove(move: Move): string {
  const { face, turns } = parseMove(move)
  return turns === 1 ? face : turns === 2 ? `${face} 2` : `${face} prime`
}

/**
 * What a clockwise turn looks like from the solving position, so nobody has to imagine
 * looking at a face they can't see.
 */
const CLOCKWISE_HINT: Record<Face, [clockwise: string, counterclockwise: string]> = {
  U: ['The front row moves to the left.', 'The front row moves to the right.'],
  D: ['The front row moves to the right.', 'The front row moves to the left.'],
  R: ['The front edge moves up.', 'The front edge moves down.'],
  L: ['The front edge moves down.', 'The front edge moves up.'],
  F: ['The top edge moves to the right.', 'The top edge moves to the left.'],
  B: ['The top edge moves to the left.', 'The top edge moves to the right.'],
}

export interface MoveDescription {
  instruction: string
  hint: string
}

export function describeMove(move: Move): MoveDescription {
  const { face, turns } = parseMove(move)
  const name = FACE_WORD[face]
  if (turns === 2) {
    return { instruction: `Turn the ${name} face twice`, hint: 'A half turn. Either direction works.' }
  }
  const direction = turns === 1 ? 'clockwise' : 'counterclockwise'
  return {
    instruction: `Turn the ${name} face ${direction}, as if you were looking straight at it`,
    hint: CLOCKWISE_HINT[face][turns === 1 ? 0 : 1],
  }
}
