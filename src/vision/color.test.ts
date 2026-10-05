import { describe, expect, it } from 'vitest'
import { ciede2000, hexToLab, labToHex, linearRgbToLab, linearToSrgb, srgbToLinear, type Lab } from './color'

describe('sRGB and Lab conversion', () => {
  it('round-trips the sRGB transfer function', () => {
    for (const value of [0, 1, 10, 64, 128, 200, 255]) {
      expect(linearToSrgb(srgbToLinear(value))).toBeCloseTo(value, 6)
    }
  })

  it('maps white, black and the primaries to their known Lab values', () => {
    const close = (lab: Lab, expected: Lab) => lab.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 1))
    close(linearRgbToLab([1, 1, 1]), [100, 0, 0])
    close(linearRgbToLab([0, 0, 0]), [0, 0, 0])
    close(hexToLab('#ff0000'), [53.24, 80.09, 67.2])
    close(hexToLab('#00ff00'), [87.73, -86.18, 83.18])
    close(hexToLab('#0000ff'), [32.3, 79.19, -107.86])
  })

  it('round-trips hex colors through Lab', () => {
    for (const hex of ['#f4f5f4', '#f7d42a', '#d7332b', '#f6861f', '#1e9b57', '#2462c7', '#000000']) {
      expect(labToHex(hexToLab(hex))).toBe(hex)
    }
  })
})

describe('CIEDE2000', () => {
  // Reference pairs from Sharma, Wu and Dalal (2005), "The CIEDE2000 color-difference formula".
  const pairs: [Lab, Lab, number][] = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, 2.8361, -74.02], [50, 0, -82.7485], 3.4412],
    [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
    [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
    [[50, 2.49, -0.001], [50, -2.49, 0.0011], 7.2195],
    [[50, -0.001, 2.49], [50, 0.0009, -2.49], 4.8045],
    [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[50, 2.5, 0], [61, -5, 29], 22.8977],
    [[50, 2.5, 0], [56, -27, -3], 31.903],
    [[50, 2.5, 0], [58, 24, 15], 19.4535],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[63.0109, -31.0961, -5.8663], [62.8187, -29.7946, -4.0864], 1.263],
    [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
    [[90.8027, -2.0831, 1.441], [91.1528, -1.6435, 0.0447], 1.4441],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ]

  it('matches the published reference values', () => {
    for (const [a, b, expected] of pairs) {
      expect(ciede2000(a, b)).toBeCloseTo(expected, 4)
      expect(ciede2000(b, a)).toBeCloseTo(expected, 4)
    }
  })

  it('is zero for identical colors', () => {
    expect(ciede2000([52, 10, -30], [52, 10, -30])).toBe(0)
  })

  it('counts lightness less when kL is raised', () => {
    const light: Lab = [80, 5, 5]
    const dark: Lab = [50, 5, 5]
    expect(ciede2000(light, dark, 2)).toBeCloseTo(ciede2000(light, dark) / 2, 6)
  })
})
