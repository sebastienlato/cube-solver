/**
 * 3D layout of the 54 facelets on a cube in the standard orientation
 * (U = +y, R = +x, F = +z). Positions use cubie coordinates: each component is -1, 0 or 1.
 * Move permutations, the 3D view and the photo mapping are all derived from this one table.
 */
import { FACES, type Face } from './facelets'

export type Vec3 = readonly [number, number, number]
/** Row-major 3×3 matrix. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number]

export const FACE_NORMAL: Record<Face, Vec3> = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
}

/**
 * Cubie position of the sticker at (row, col) of a face, following the numbering in SPEC.md
 * section 5: U seen from above with B at the top, D from below with F at the top, and the
 * side faces seen straight on with U at the top.
 */
const STICKER_POSITION: Record<Face, (row: number, col: number) => Vec3> = {
  U: (r, c) => [c - 1, 1, r - 1],
  R: (r, c) => [1, 1 - r, 1 - c],
  F: (r, c) => [c - 1, 1 - r, 1],
  D: (r, c) => [c - 1, -1, 1 - r],
  L: (r, c) => [-1, 1 - r, c - 1],
  B: (r, c) => [1 - c, 1 - r, -1],
}

export interface FaceletGeometry {
  index: number
  face: Face
  row: number
  col: number
  /** The cubie the sticker belongs to. */
  position: Vec3
  normal: Vec3
}

export const FACELET_GEOMETRY: FaceletGeometry[] = FACES.flatMap((face, f) =>
  Array.from({ length: 9 }, (_, k) => {
    const row = Math.floor(k / 3)
    const col = k % 3
    return { index: f * 9 + k, face, row, col, position: STICKER_POSITION[face](row, col), normal: FACE_NORMAL[face] }
  }),
)

const key = (position: Vec3, normal: Vec3) => `${position.join(',')}|${normal.join(',')}`

const INDEX_BY_KEY = new Map(FACELET_GEOMETRY.map((g) => [key(g.position, g.normal), g.index]))

/** The facelet whose sticker sits on cubie `position` facing `normal`. */
export function faceletAt(position: Vec3, normal: Vec3): number {
  const index = INDEX_BY_KEY.get(key(position, normal))
  if (index === undefined) throw new Error(`No facelet at ${key(position, normal)}`)
  return index
}

export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

/**
 * Rotates `v` by a quarter turn about a unit axis, clockwise as seen by someone looking
 * at the face that the axis points out of. That is the direction of a face turn in cube
 * notation, and it is minus 90 degrees by the right-hand rule.
 */
export function quarterTurn(v: Vec3, axis: Vec3): Vec3 {
  const along = dot(axis, v)
  const c = cross(axis, v)
  return [axis[0] * along - c[0], axis[1] * along - c[1], axis[2] * along - c[2]]
}

export const applyMat3 = (m: Mat3, v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
]

const determinant = (m: Mat3): number =>
  m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6])

/** The 24 rigid rotations of a cube: signed permutation matrices with determinant +1 (no mirrors). */
export const CUBE_ROTATIONS: Mat3[] = (() => {
  const rotations: Mat3[] = []
  const axisOrders = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ]
  for (const order of axisOrders) {
    for (let signs = 0; signs < 8; signs++) {
      const m = [0, 0, 0, 0, 0, 0, 0, 0, 0]
      order.forEach((column, row) => {
        m[row * 3 + column] = signs & (1 << row) ? -1 : 1
      })
      const matrix = m as unknown as Mat3
      if (determinant(matrix) === 1) rotations.push(matrix)
    }
  }
  return rotations
})()

/** The face whose outward normal is `normal`. */
export function faceWithNormal(normal: Vec3): Face {
  const face = FACES.find((f) => dot(FACE_NORMAL[f], normal) === 1)
  if (!face) throw new Error(`Not a face normal: ${normal.join(',')}`)
  return face
}
