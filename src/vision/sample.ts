/** Reads one representative color per sticker out of a photo. */
import { srgbToLinear, type RGB } from './color'
import { applyHomography, homographyFromUnitSquare } from './homography'
import { CELLS_PER_PHOTO, QUAD_NAMES, cellIndex, quadOf, type Handles } from './views'

/** An RGBA pixel buffer, as in ImageData. */
export interface Raster {
  data: Uint8ClampedArray | Uint8Array
  width: number
  height: number
}

/** Share of a cell's width that is sampled, centered, to stay clear of the black borders. */
export const PATCH_FRACTION = 0.4
/**
 * Center stickers get a wider patch. Many cubes print a logo on one center; over a wider
 * area the logo is a minority of the pixels and the median stays on the sticker's own color.
 * The center of a face is also where a slightly misplaced grid is off by the least.
 */
export const CENTER_PATCH_FRACTION = 0.62
/** Samples per side of the patch. 81 pixels is plenty for a median and costs nothing. */
const GRID = 9

const LINEAR = Float32Array.from({ length: 256 }, (_, value) => srgbToLinear(value))

function median(values: Float32Array): number {
  values.sort()
  const middle = values.length >> 1
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
}

/**
 * The 27 sticker colors of one corner photo, in linear RGB. Each is the per-channel median of
 * a grid of pixels inside the cell, which shrugs off glare spots, shadows and stray edges.
 * Pixels are read at the photo's full resolution; only 27 × 81 of them are touched, so the
 * cost does not depend on the photo's size.
 */
export function sampleCells(image: Raster, handles: Handles): RGB[] {
  const samples: RGB[] = new Array(CELLS_PER_PHOTO)
  const channels = [new Float32Array(GRID * GRID), new Float32Array(GRID * GRID), new Float32Array(GRID * GRID)]

  QUAD_NAMES.forEach((quad, q) => {
    const toImage = homographyFromUnitSquare(quadOf(handles, quad))
    for (let row = 0; row < 3; row++) {
      for (let column = 0; column < 3; column++) {
        let n = 0
        const fraction = row === 1 && column === 1 ? CENTER_PATCH_FRACTION : PATCH_FRACTION
        for (let j = 0; j < GRID; j++) {
          for (let i = 0; i < GRID; i++) {
            const u = (column + 0.5 + (i / (GRID - 1) - 0.5) * fraction) / 3
            const v = (row + 0.5 + (j / (GRID - 1) - 0.5) * fraction) / 3
            const point = applyHomography(toImage, u, v)
            const x = Math.min(image.width - 1, Math.max(0, Math.round(point.x)))
            const y = Math.min(image.height - 1, Math.max(0, Math.round(point.y)))
            const offset = (y * image.width + x) * 4
            channels[0][n] = LINEAR[image.data[offset]]
            channels[1][n] = LINEAR[image.data[offset + 1]]
            channels[2][n] = LINEAR[image.data[offset + 2]]
            n++
          }
        }
        samples[cellIndex(q, row, column)] = [median(channels[0]), median(channels[1]), median(channels[2])]
      }
    }
  })
  return samples
}
