/**
 * Plane-to-plane perspective maps. A cube face photographed at an angle is the unit square
 * seen through a homography, so four corner points are enough to find any sticker on it.
 */

export interface Point {
  x: number
  y: number
}

/** Row-major 3×3 matrix. */
export type Homography = readonly [number, number, number, number, number, number, number, number, number]

/** A quadrilateral as the images of the unit square's corners (0,0), (1,0), (1,1), (0,1). */
export type Quad = readonly [Point, Point, Point, Point]

const UNIT_SQUARE: Quad = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

/** Solves A·x = b in place by Gaussian elimination with partial pivoting. */
function solveLinear(a: number[][], b: number[]): number[] {
  const n = b.length
  for (let column = 0; column < n; column++) {
    let pivot = column
    for (let row = column + 1; row < n; row++) {
      if (Math.abs(a[row][column]) > Math.abs(a[pivot][column])) pivot = row
    }
    if (Math.abs(a[pivot][column]) < 1e-12) throw new Error('Degenerate quadrilateral')
    ;[a[column], a[pivot]] = [a[pivot], a[column]]
    ;[b[column], b[pivot]] = [b[pivot], b[column]]
    for (let row = column + 1; row < n; row++) {
      const factor = a[row][column] / a[column][column]
      if (factor === 0) continue
      for (let k = column; k < n; k++) a[row][k] -= factor * a[column][k]
      b[row] -= factor * b[column]
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let row = n - 1; row >= 0; row--) {
    let sum = b[row]
    for (let k = row + 1; k < n; k++) sum -= a[row][k] * x[k]
    x[row] = sum / a[row][row]
  }
  return x
}

/**
 * The homography taking four source points to four destination points (direct linear
 * transform with h33 fixed at 1, which leaves an 8×8 linear system).
 */
export function homographyBetween(source: Quad, destination: Quad): Homography {
  const a: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = source[i]
    const { x: u, y: v } = destination[i]
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  const h = solveLinear(a, b)
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1]
}

/** The homography taking the unit square onto `quad`. */
export const homographyFromUnitSquare = (quad: Quad): Homography => homographyBetween(UNIT_SQUARE, quad)

export function applyHomography(h: Homography, x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + h[8]
  return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w }
}

export function invertHomography(h: Homography): Homography {
  const [a, b, c, d, e, f, g, i, j] = h
  const det = a * (e * j - f * i) - b * (d * j - f * g) + c * (d * i - e * g)
  if (Math.abs(det) < 1e-14) throw new Error('Homography is not invertible')
  return [
    (e * j - f * i) / det,
    (c * i - b * j) / det,
    (b * f - c * e) / det,
    (f * g - d * j) / det,
    (a * j - c * g) / det,
    (c * d - a * f) / det,
    (d * i - e * g) / det,
    (b * g - a * i) / det,
    (a * e - b * d) / det,
  ]
}
