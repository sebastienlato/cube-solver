/**
 * Facelet indexing in URFDLB order (the Kociemba convention, also used by cubejs).
 * Index = face * 9 + (row * 3 + col); each character is the face letter whose center
 * color that sticker matches.
 */

export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const
export type Face = (typeof FACES)[number]

export const SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'

export const OPPOSITE: Record<Face, Face> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' }

/** Where each face sits when the cube is held in the solving orientation. */
export const FACE_WORD: Record<Face, string> = {
  U: 'top',
  D: 'bottom',
  R: 'right',
  L: 'left',
  F: 'front',
  B: 'back',
}

export const faceIndex = (face: Face): number => FACES.indexOf(face)
export const faceOf = (index: number): Face => FACES[Math.floor(index / 9)]
export const centerIndex = (face: Face): number => faceIndex(face) * 9 + 4
export const isCenter = (index: number): boolean => index % 9 === 4
export const isFace = (char: string): char is Face => (FACES as readonly string[]).includes(char)

/** Index of a facelet from its face and its 1–9 number, e.g. `facelet('U', 9)`. */
export const facelet = (face: Face, n: number): number => faceIndex(face) * 9 + n - 1

export interface PiecePosition {
  /** Faces the position touches. Corners list them clockwise, as Kociemba does. */
  name: string
  facelets: number[]
}

const position = (spec: string): PiecePosition => {
  const parts = spec.split(' ')
  return {
    name: parts.map((p) => p[0]).join(''),
    facelets: parts.map((p) => facelet(p[0] as Face, Number(p[1]))),
  }
}

export const CORNERS: PiecePosition[] = [
  'U9 R1 F3',
  'U7 F1 L3',
  'U1 L1 B3',
  'U3 B1 R3',
  'D3 F9 R7',
  'D1 L9 F7',
  'D7 B9 L7',
  'D9 R9 B7',
].map(position)

export const EDGES: PiecePosition[] = [
  'U6 R2',
  'U8 F2',
  'U4 L2',
  'U2 B2',
  'D6 R8',
  'D2 F8',
  'D4 L8',
  'D8 B8',
  'F6 R4',
  'F4 L6',
  'B6 L4',
  'B4 R6',
].map(position)

export const isFaceletString = (value: unknown): value is string =>
  typeof value === 'string' && value.length === 54 && [...value].every(isFace)

export const replaceAt = (state: string, index: number, face: Face): string =>
  state.slice(0, index) + face + state.slice(index + 1)
