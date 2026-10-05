/**
 * Gives each face's measured color a plain name ("white", "orange"…) for messages, and a
 * cleaned-up display color. The solver never sees any of this; it works on face letters.
 */
import { FACES, type Face } from '../cube/facelets'
import { COLOR_NAMES, STICKER_COLORS, type ColorName, type ColorScheme } from '../cube/scheme'
import { ciede2000, hexToLab, labToHex, type Lab } from './color'

const REFERENCE: Record<ColorName, Lab> = Object.fromEntries(
  COLOR_NAMES.map((name) => [name, hexToLab(STICKER_COLORS[name])]),
) as Record<ColorName, Lab>

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
  )
}

const NAME_ORDERS = permutations(COLOR_NAMES)

/**
 * Names the six face colors, each name used once. Matching all six together (rather than
 * each to its nearest name) keeps a dull orange and a red from both being called "red".
 */
export function nameFaceColors(labs: Record<Face, Lab>): Record<Face, ColorName> {
  const cost = FACES.map((face) => COLOR_NAMES.map((name) => ciede2000(labs[face], REFERENCE[name])))
  let best = NAME_ORDERS[0]
  let bestCost = Infinity
  for (const order of NAME_ORDERS) {
    const total = order.reduce((sum, name, f) => sum + cost[f][COLOR_NAMES.indexOf(name)], 0)
    if (total < bestCost) {
      bestCost = total
      best = order
    }
  }
  return Object.fromEntries(FACES.map((face, f) => [face, best[f]])) as Record<Face, ColorName>
}

const schemeLabs = (colors: ColorScheme) =>
  Object.fromEntries(FACES.map((face) => [face, hexToLab(colors[face])])) as Record<Face, Lab>

const nameCache = new Map<string, Record<Face, ColorName>>()

export function nameScheme(colors: ColorScheme): Record<Face, ColorName> {
  const key = FACES.map((face) => colors[face]).join()
  let names = nameCache.get(key)
  if (!names) {
    names = nameFaceColors(schemeLabs(colors))
    nameCache.set(key, names)
  }
  return names
}

/**
 * Display colors for a scanned cube: each measured center pulled halfway toward the clean
 * reference of its name. The cube still looks like the user's cube, without the muddiness of
 * indoor photos.
 */
export function cleanScheme(labs: Record<Face, Lab>): ColorScheme {
  const names = nameFaceColors(labs)
  return Object.fromEntries(
    FACES.map((face) => {
      const measured = labs[face]
      const reference = REFERENCE[names[face]]
      const mixed: Lab = [
        (measured[0] + reference[0]) / 2,
        (measured[1] + reference[1]) / 2,
        (measured[2] + reference[2]) / 2,
      ]
      return [face, labToHex(mixed)]
    }),
  ) as ColorScheme
}
