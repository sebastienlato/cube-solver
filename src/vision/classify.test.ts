import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../cube/state'
import { classifyBalanced, colorDistance, withoutBrightness } from './classify'
import { hexToLab, linearRgbToLab, type Lab } from './color'

const BASE: Lab[] = ['#e8e8e2', '#bc2026', '#22964a', '#e2cc2c', '#ee701e', '#1e52b2'].map(hexToLab)

/** Six centers followed by eight stickers of each color, each nudged by a little noise. */
function cube(rng: () => number, noise: number): { samples: Lab[]; truth: number[] } {
  const samples: Lab[] = [...BASE]
  const truth = [0, 1, 2, 3, 4, 5]
  for (let k = 0; k < 6; k++) {
    for (let n = 0; n < 8; n++) {
      samples.push(BASE[k].map((v) => v + (rng() * 2 - 1) * noise) as unknown as Lab)
      truth.push(k)
    }
  }
  return { samples, truth }
}

describe('brightness-free color distance', () => {
  it('sees the same color in light and in shade as one color', () => {
    const orange = [0.85, 0.16, 0.013] as const
    const lit = linearRgbToLab(orange)
    const shaded = linearRgbToLab([orange[0] * 0.5, orange[1] * 0.5, orange[2] * 0.5])
    expect(colorDistance(lit, shaded)).toBeLessThan(1)
  })

  it('still tells all six sticker colors apart', () => {
    for (let a = 0; a < 6; a++) {
      for (let b = a + 1; b < 6; b++) expect(colorDistance(BASE[a], BASE[b])).toBeGreaterThan(12)
    }
  })

  it('normalizes to a fixed lightness', () => {
    expect(withoutBrightness([20, 10, -30])[0]).toBe(withoutBrightness([90, 3, 3])[0])
  })
})

describe('classifyBalanced', () => {
  const centers = [0, 1, 2, 3, 4, 5]

  it('labels clean stickers correctly with nine in every class', () => {
    const { samples, truth } = cube(mulberry32(1), 3)
    const { labels, confidence } = classifyBalanced(samples, centers)
    expect(labels).toEqual(truth)
    for (let k = 0; k < 6; k++) expect(labels.filter((label) => label === k)).toHaveLength(9)
    expect(confidence.slice(0, 6).every((gap) => gap === Infinity)).toBe(true)
    expect(Math.min(...confidence)).toBeGreaterThan(5)
  })

  it('uses the nine-per-color rule to settle a sticker that sits between two colors', () => {
    const { samples, truth } = cube(mulberry32(2), 2)
    // One red sticker photographed halfway to orange: on its own it could go either way.
    const doubtful = 6 + 8
    samples[doubtful] = [
      (BASE[1][0] + BASE[4][0]) / 2,
      (BASE[1][1] + BASE[4][1]) / 2 - 1,
      (BASE[1][2] + BASE[4][2]) / 2 + 1,
    ]
    const { labels, confidence } = classifyBalanced(samples, centers)
    expect(labels).toEqual(truth)
    // It is the least certain sticker of the lot.
    expect(confidence.indexOf(Math.min(...confidence))).toBe(doubtful)
  })

  it('moves each class color to the mean of its members, away from an odd center', () => {
    const { samples } = cube(mulberry32(3), 1)
    // The white center carries a logo and reads grayish blue; the eight white stickers do not.
    samples[0] = [70, -2, -14]
    const { labels, prototypes } = classifyBalanced(samples, centers)
    expect(labels.slice(6, 14)).toEqual(Array(8).fill(0))
    expect(Math.abs(prototypes[0][2])).toBeLessThan(4)
  })

  it('refuses a sample set of the wrong size', () => {
    expect(() => classifyBalanced(BASE, centers)).toThrow()
  })
})
