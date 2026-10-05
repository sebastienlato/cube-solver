import type { Face } from './facelets'

/** One display color per face, as a hex string. */
export type ColorScheme = Record<Face, string>

/** The six sticker colors of a standard cube. Used on stickers only, never as decoration. */
export const STICKER_COLORS = {
  white: '#f4f5f4',
  yellow: '#f7d42a',
  red: '#d7332b',
  orange: '#f6861f',
  green: '#1e9b57',
  blue: '#2462c7',
} as const

export type ColorName = keyof typeof STICKER_COLORS

export const COLOR_NAMES = Object.keys(STICKER_COLORS) as ColorName[]

/** Western scheme: white on top, green in front, red on the right. */
export const DEFAULT_SCHEME: ColorScheme = {
  U: STICKER_COLORS.white,
  R: STICKER_COLORS.red,
  F: STICKER_COLORS.green,
  D: STICKER_COLORS.yellow,
  L: STICKER_COLORS.orange,
  B: STICKER_COLORS.blue,
}
