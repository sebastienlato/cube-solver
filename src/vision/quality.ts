/** Quick checks that a photo is usable, so the Adjust screen can warn before colors are read. */
import type { Raster } from './sample'
import { HANDLE_NAMES, type Handles } from './views'

export interface PhotoQuality {
  /** Even the brightest stickers are dim. */
  tooDark: boolean
  /** Light and dark parts of the cube are barely different: haze, a smeared lens or a very flat exposure. */
  lowContrast: boolean
}

/** sRGB level (0–255) the bright end of the cube should reach. */
const DARK_LEVEL = 100
/** Smallest acceptable spread between the dark and bright ends. */
const CONTRAST_SPREAD = 50
const GRID = 48

/** Looks only at the area inside the handles: a dark table around a well-lit cube is fine. */
export function assessPhoto(image: Raster, handles: Handles): PhotoQuality {
  const xs = HANDLE_NAMES.map((name) => handles[name].x)
  const ys = HANDLE_NAMES.map((name) => handles[name].y)
  const left = Math.max(0, Math.min(...xs))
  const right = Math.min(image.width - 1, Math.max(...xs))
  const top = Math.max(0, Math.min(...ys))
  const bottom = Math.min(image.height - 1, Math.max(...ys))

  const levels: number[] = []
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const x = Math.round(left + ((right - left) * (i + 0.5)) / GRID)
      const y = Math.round(top + ((bottom - top) * (j + 0.5)) / GRID)
      const offset = (y * image.width + x) * 4
      levels.push(0.2126 * image.data[offset] + 0.7152 * image.data[offset + 1] + 0.0722 * image.data[offset + 2])
    }
  }
  levels.sort((a, b) => a - b)
  const low = levels[Math.floor(levels.length * 0.05)]
  const high = levels[Math.floor(levels.length * 0.95)]
  return { tooDark: high < DARK_LEVEL, lowContrast: high - low < CONTRAST_SPREAD }
}
