/**
 * Piece-level validation of a facelet string, with messages a cube owner can act on.
 * Opposite faces come from the face letters (U–D, R–L, F–B), never from a color scheme.
 */
import {
  CORNERS,
  EDGES,
  FACES,
  FACE_WORD,
  OPPOSITE,
  centerIndex,
  isFaceletString,
  type Face,
  type PiecePosition,
} from './facelets'
import { permutationParity } from './state'

export type ColorNames = Record<Face, string>

export const DEFAULT_COLOR_NAMES: ColorNames = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
}

export type IssueCode =
  | 'format'
  | 'centers'
  | 'count'
  | 'edge-impossible'
  | 'edge-duplicate'
  | 'corner-impossible'
  | 'corner-mirrored'
  | 'corner-duplicate'
  | 'corner-twist'
  | 'edge-flip'
  | 'parity'

export interface ValidationIssue {
  code: IssueCode
  message: string
  /** Stickers worth a second look. Empty when the validator can't narrow it down. */
  facelets: number[]
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
}

const UNREACHABLE =
  "This position can't be reached by turning the cube; one piece may have been reassembled or a sticker misread."

const WORD_ORDER: Face[] = ['U', 'D', 'F', 'B', 'L', 'R']

const positionName = (pos: PiecePosition): string =>
  ([...pos.name] as Face[])
    .sort((a, b) => WORD_ORDER.indexOf(a) - WORD_ORDER.indexOf(b))
    .map((f) => FACE_WORD[f])
    .join('-')

const list = (items: string[]): string =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

interface PieceReading {
  position: PiecePosition
  letters: Face[]
  /** Index of the real piece found here, or null when no such piece exists. */
  piece: number | null
  /** Corner twist (0–2) or edge flip (0–1). */
  orientation: number
  mirrored: boolean
}

/** Identifies the piece at a position by trying each rotation of its stickers. */
function readPiece(state: string, position: PiecePosition, pieces: PiecePosition[]): PieceReading {
  const letters = position.facelets.map((i) => state[i] as Face)
  const size = letters.length
  for (let piece = 0; piece < pieces.length; piece++) {
    const home = pieces[piece].name
    for (let orientation = 0; orientation < size; orientation++) {
      if (letters.every((_, n) => letters[(n + orientation) % size] === home[n])) {
        return { position, letters, piece, orientation, mirrored: false }
      }
    }
  }
  const sorted = [...letters].sort().join('')
  // Same three colors as a real corner but in the other rotational order: a mirror image.
  const mirrored = size === 3 && pieces.some((p) => [...p.name].sort().join('') === sorted)
  return { position, letters, piece: null, orientation: 0, mirrored }
}

function impossibleReason(letters: Face[], names: ColorNames): string {
  for (let i = 0; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      if (letters[i] === letters[j]) {
        return `has two ${names[letters[i]]} stickers. Every sticker on a piece is a different color.`
      }
      if (OPPOSITE[letters[i]] === letters[j]) {
        return `has ${names[letters[i]]} and ${names[letters[j]]}, which sit on opposite faces. No such piece exists.`
      }
    }
  }
  return 'is not a real piece.'
}

function pieceIssues(
  readings: PieceReading[],
  pieces: PiecePosition[],
  kind: 'edge' | 'corner',
  names: ColorNames,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const colorsOf = (piece: number) => list(([...pieces[piece].name] as Face[]).map((f) => names[f]))

  for (const reading of readings) {
    if (reading.piece !== null) continue
    const where = `The ${positionName(reading.position)} ${kind}`
    if (reading.mirrored) {
      issues.push({
        code: 'corner-mirrored',
        message: `${where} has ${list(reading.letters.map((f) => names[f]))} in mirror-image order. Two of its stickers are probably swapped.`,
        facelets: reading.position.facelets,
      })
    } else {
      issues.push({
        code: `${kind}-impossible`,
        message: `${where} ${impossibleReason(reading.letters, names)}`,
        facelets: reading.position.facelets,
      })
    }
  }

  const positionsByPiece = new Map<number, PieceReading[]>()
  for (const reading of readings) {
    if (reading.piece === null) continue
    positionsByPiece.set(reading.piece, [...(positionsByPiece.get(reading.piece) ?? []), reading])
  }
  const duplicates = [...positionsByPiece.entries()].filter(([, found]) => found.length > 1)
  const missing = pieces.map((_, i) => i).filter((i) => !positionsByPiece.has(i))
  for (const [piece, found] of duplicates) {
    const times = found.length === 2 ? 'twice' : `${found.length} times`
    const guess =
      duplicates.length === 1 && missing.length === 1 && found.length === 2
        ? ` One of them is probably the ${colorsOf(missing[0])} ${kind}, which is missing.`
        : ' One of them has a misread sticker.'
    issues.push({
      code: `${kind}-duplicate`,
      message: `The ${colorsOf(piece)} ${kind} appears ${times}.${guess}`,
      facelets: found.flatMap((r) => r.position.facelets),
    })
  }
  return issues
}

function countIssue(state: string, names: ColorNames, suspects: Set<number>): ValidationIssue | null {
  const counts = FACES.map((face) => ({ face, count: [...state].filter((c) => c === face).length }))
  const off = counts.filter((c) => c.count !== 9).sort((a, b) => b.count - a.count)
  if (off.length === 0) return null

  const parts = off.map(({ face, count }, i) =>
    i === 0 ? `${count} ${names[face]} sticker${count === 1 ? '' : 's'}` : `${count} ${names[face]}`,
  )
  const verb = off[0].count === 1 ? 'is' : 'are'
  const simpleSwap = off.length === 2 && off[0].count === 10 && off[1].count === 8
  const advice = simpleSwap
    ? `One ${names[off[0].face]} sticker is probably ${names[off[1].face]}.`
    : 'Every color needs exactly 9.'

  const surplus = new Set(off.filter((c) => c.count > 9).map((c) => c.face))
  return {
    code: 'count',
    message: `There ${verb} ${list(parts)}. ${advice}`,
    // A surplus sticker sitting on an impossible or duplicated piece is the likeliest misread.
    facelets: [...suspects].filter((i) => surplus.has(state[i] as Face)).sort((a, b) => a - b),
  }
}

export function validate(state: string, names: ColorNames = DEFAULT_COLOR_NAMES): ValidationResult {
  if (!isFaceletString(state)) {
    return {
      valid: false,
      issues: [
        { code: 'format', message: 'The cube needs 54 stickers, each in one of the six center colors.', facelets: [] },
      ],
    }
  }

  const issues: ValidationIssue[] = []

  const wrongCenters = FACES.filter((face) => state[centerIndex(face)] !== face)
  if (wrongCenters.length > 0) {
    issues.push({
      code: 'centers',
      message: `The ${list(wrongCenters.map((f) => FACE_WORD[f]))} center${wrongCenters.length === 1 ? ' is' : 's are'} not in place. Each center sets the color of its face, so all six must be different.`,
      facelets: wrongCenters.map(centerIndex),
    })
  }

  const edges = EDGES.map((pos) => readPiece(state, pos, EDGES))
  const corners = CORNERS.map((pos) => readPiece(state, pos, CORNERS))
  const badPieces = [...pieceIssues(edges, EDGES, 'edge', names), ...pieceIssues(corners, CORNERS, 'corner', names)]

  const count = countIssue(state, names, new Set(badPieces.flatMap((issue) => issue.facelets)))
  if (count) issues.push(count)
  issues.push(...badPieces)

  // Twist, flip and parity only mean something once every piece is real and unique.
  if (issues.length === 0) {
    const twist = corners.reduce((sum, c) => sum + c.orientation, 0) % 3
    if (twist !== 0) {
      issues.push({ code: 'corner-twist', message: `One corner is twisted in place. ${UNREACHABLE}`, facelets: [] })
    }
    const flip = edges.reduce((sum, e) => sum + e.orientation, 0) % 2
    if (flip !== 0) {
      issues.push({ code: 'edge-flip', message: `One edge is flipped in place. ${UNREACHABLE}`, facelets: [] })
    }
    const cornerParity = permutationParity(corners.map((c) => c.piece as number))
    const edgeParity = permutationParity(edges.map((e) => e.piece as number))
    if (cornerParity !== edgeParity) {
      issues.push({ code: 'parity', message: `Two pieces have traded places. ${UNREACHABLE}`, facelets: [] })
    }
  }

  return { valid: issues.length === 0, issues }
}
