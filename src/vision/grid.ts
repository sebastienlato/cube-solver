/** The lines of the three sticker grids for a set of handles, as SVG path data in image pixels. */
import { applyHomography, homographyFromUnitSquare } from './homography'
import { QUAD_NAMES, quadOf, type Handles } from './views'

export interface GridPaths {
  /** The edges of the three faces. */
  outline: string
  /** The lines between stickers. */
  inner: string
}

/**
 * Built from the same homographies the sampler uses, so the grid a user lines up is exactly
 * where colors are read. A face whose corners have been dragged onto one line is skipped.
 */
export function gridPaths(handles: Handles): GridPaths {
  let outline = ''
  let inner = ''
  for (const quad of QUAD_NAMES) {
    let toImage
    try {
      toImage = homographyFromUnitSquare(quadOf(handles, quad))
    } catch {
      continue
    }
    const segment = (x1: number, y1: number, x2: number, y2: number) => {
      const a = applyHomography(toImage, x1, y1)
      const b = applyHomography(toImage, x2, y2)
      return `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`
    }
    for (const t of [0, 1]) outline += segment(t, 0, t, 1) + segment(0, t, 1, t)
    for (const t of [1 / 3, 2 / 3]) inner += segment(t, 0, t, 1) + segment(0, t, 1, t)
  }
  return { outline, inner }
}
