/**
 * Per-photo white balance. The two photos are taken seconds apart but the camera may pick a
 * different white point and exposure for each, so each photo is normalized before colors are
 * compared across them.
 */
import type { RGB } from './color'

export type BalanceMethod = 'white-patch' | 'borrowed' | 'gray-world'

export interface Balance {
  gains: RGB
  method: BalanceMethod
}

/** A sticker counts as near-neutral when its channels differ by less than this share of the largest. */
const NEUTRAL_SATURATION = 0.35
/** Near-neutral stickers must also be at least this bright relative to the brightest sticker. */
const NEUTRAL_BRIGHTNESS = 0.3
/** Linear level the white reference is scaled to; leaves headroom above white for glare. */
const WHITE_LEVEL = 0.8

const luminance = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b

/**
 * Gains that make the photo's bright, low-chroma stickers neutral. White stickers are the
 * one known reference on a cube: whatever tint they show is the light's. Returns null when
 * the photo has no such sticker (for example three colored faces of a nearly solved cube).
 */
export function whitePatchGains(samples: RGB[]): RGB | null {
  const brightest = Math.max(...samples.map(luminance))
  const neutral = samples.filter((sample) => {
    const high = Math.max(...sample)
    const low = Math.min(...sample)
    return high > 0 && (high - low) / high <= NEUTRAL_SATURATION && luminance(sample) >= NEUTRAL_BRIGHTNESS * brightest
  })
  if (neutral.length === 0) return null
  const mean = [0, 1, 2].map((c) => neutral.reduce((sum, s) => sum + s[c], 0) / neutral.length)
  if (mean.some((value) => value <= 0)) return null
  return [WHITE_LEVEL / mean[0], WHITE_LEVEL / mean[1], WHITE_LEVEL / mean[2]]
}

/** Gains that make the average of the samples neutral at a mid level. */
export function grayWorldGains(samples: RGB[]): RGB {
  const mean = [0, 1, 2].map((c) => samples.reduce((sum, s) => sum + s[c], 0) / samples.length)
  const gray = (mean[0] + mean[1] + mean[2]) / 3
  return mean.map((value) => (value > 0 ? gray / value : 1)) as unknown as RGB
}

export const applyGains = (sample: RGB, gains: RGB): RGB => [
  sample[0] * gains[0],
  sample[1] * gains[1],
  sample[2] * gains[2],
]

/**
 * Chooses the balance for each of the two photos:
 *  1. white-patch, when the photo shows a near-neutral sticker;
 *  2. otherwise the other photo's gains, since both were taken under the same light;
 *  3. otherwise gray-world over all 54 stickers together. A whole cube always holds nine
 *     stickers of each color, so that average does not depend on the scramble, which a
 *     single photo's average does.
 */
export function balancePhotos(first: RGB[], second: RGB[]): [Balance, Balance] {
  const own = [whitePatchGains(first), whitePatchGains(second)]
  if (!own[0] && !own[1]) {
    const gains = grayWorldGains([...first, ...second])
    return [
      { gains, method: 'gray-world' },
      { gains, method: 'gray-world' },
    ]
  }
  return [0, 1].map((photo): Balance => {
    const gains = own[photo]
    return gains ? { gains, method: 'white-patch' } : { gains: own[1 - photo] as RGB, method: 'borrowed' }
  }) as [Balance, Balance]
}
