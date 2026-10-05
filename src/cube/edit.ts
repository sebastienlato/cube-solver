/** Edits to a cube being reviewed or entered by hand. Pure, so the rules are easy to test. */
import { FACES, centerIndex, isCenter, replaceAt, type Face } from './facelets'
import type { ColorScheme } from './scheme'

export interface EditableCube {
  facelets: string
  colors: ColorScheme
}

/** Recolors one sticker to match the center of `face`. Centers are left alone. */
export function paintSticker(cube: EditableCube, index: number, face: Face): EditableCube {
  if (isCenter(index)) return cube
  return { ...cube, facelets: replaceAt(cube.facelets, index, face) }
}

/**
 * Gives the center of `face` the color currently on the center of `other`, and vice versa.
 * Every other sticker keeps the color the user sees: its letter is swapped along with the
 * scheme, because a letter means "same color as that face's center".
 */
export function swapCenterColors(cube: EditableCube, face: Face, other: Face): EditableCube {
  if (face === other) return cube
  const colors = { ...cube.colors, [face]: cube.colors[other], [other]: cube.colors[face] }
  const facelets = [...cube.facelets]
    .map((letter, index) => {
      if (isCenter(index)) return letter
      return letter === face ? other : letter === other ? face : letter
    })
    .join('')
  return { facelets, colors }
}

/** Sets a sticker to the color of `face`'s center; on a center, swaps the two faces' colors instead. */
export function applyColor(cube: EditableCube, index: number, face: Face): EditableCube {
  if (!isCenter(index)) return paintSticker(cube, index, face)
  const own = FACES.find((f) => centerIndex(f) === index) as Face
  return swapCenterColors(cube, own, face)
}

/** Faces in the order they read on the unfolded net: top, then the middle row, then bottom. */
export const NET_FACE_ORDER: Face[] = ['U', 'L', 'F', 'R', 'B', 'D']

/** The next sticker to fill in when entering a cube by hand, skipping centers. Null after the last. */
export function nextSticker(index: number): number | null {
  const order = NET_FACE_ORDER.flatMap((face) =>
    Array.from({ length: 9 }, (_, k) => FACES.indexOf(face) * 9 + k).filter((i) => !isCenter(i)),
  )
  const at = order.indexOf(index)
  return at >= 0 && at < order.length - 1 ? order[at + 1] : null
}
