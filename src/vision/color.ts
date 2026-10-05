/**
 * Color math for the vision pipeline: sRGB ↔ linear RGB ↔ CIELAB (D65) and the CIEDE2000
 * difference. Pure functions on plain tuples.
 */

/** Three channels. Whether they are linear or gamma-encoded is stated by each function. */
export type RGB = readonly [number, number, number]
export type Lab = readonly [l: number, a: number, b: number]

/** sRGB channel 0–255 to linear 0–1. */
export function srgbToLinear(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Linear 0–1 to sRGB channel 0–255 (not rounded). */
export function linearToSrgb(value: number): number {
  const c = Math.min(1, Math.max(0, value))
  return 255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055)
}

const D65 = [0.95047, 1, 1.08883] as const
const EPSILON = 216 / 24389
const KAPPA = 24389 / 27

export function linearRgbToLab([r, g, b]: RGB): Lab {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / D65[0]
  const y = (0.2126729 * r + 0.7151522 * g + 0.072175 * b) / D65[1]
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / D65[2]
  const f = (t: number) => (t > EPSILON ? Math.cbrt(t) : (KAPPA * t + 16) / 116)
  const [fx, fy, fz] = [f(x), f(y), f(z)]
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function labToLinearRgb([l, a, b]: Lab): RGB {
  const fy = (l + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const inverse = (f: number) => (f ** 3 > EPSILON ? f ** 3 : (116 * f - 16) / KAPPA)
  const x = inverse(fx) * D65[0]
  const y = (l > KAPPA * EPSILON ? fy ** 3 : l / KAPPA) * D65[1]
  const z = inverse(fz) * D65[2]
  return [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ]
}

export function hexToLinearRgb(hex: string): RGB {
  const value = parseInt(hex.replace('#', ''), 16)
  return [srgbToLinear((value >> 16) & 255), srgbToLinear((value >> 8) & 255), srgbToLinear(value & 255)]
}

export const hexToLab = (hex: string): Lab => linearRgbToLab(hexToLinearRgb(hex))

export function linearRgbToHex(rgb: RGB): string {
  return `#${rgb
    .map((c) =>
      Math.round(linearToSrgb(c))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

export const labToHex = (lab: Lab): string => linearRgbToHex(labToLinearRgb(lab))

const RAD = Math.PI / 180

/**
 * CIEDE2000 color difference. `kL` above 1 makes the measure more forgiving of lightness
 * differences, which is how a sticker in shade differs from the same sticker in light.
 */
export function ciede2000(first: Lab, second: Lab, kL = 1): number {
  const [l1, a1, b1] = first
  const [l2, a2, b2] = second
  const meanChroma = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2
  const g = 0.5 * (1 - Math.sqrt(meanChroma ** 7 / (meanChroma ** 7 + 25 ** 7)))
  const ap1 = (1 + g) * a1
  const ap2 = (1 + g) * a2
  const c1 = Math.hypot(ap1, b1)
  const c2 = Math.hypot(ap2, b2)
  const hue = (bb: number, aa: number) => (bb === 0 && aa === 0 ? 0 : (Math.atan2(bb, aa) / RAD + 360) % 360)
  const h1 = hue(b1, ap1)
  const h2 = hue(b2, ap2)

  const dL = l2 - l1
  const dC = c2 - c1
  let dh = 0
  if (c1 * c2 !== 0) {
    dh = h2 - h1
    if (dh > 180) dh -= 360
    else if (dh < -180) dh += 360
  }
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((dh * RAD) / 2)

  const meanL = (l1 + l2) / 2
  const meanC = (c1 + c2) / 2
  let meanH = h1 + h2
  if (c1 * c2 !== 0) {
    if (Math.abs(h1 - h2) <= 180) meanH = (h1 + h2) / 2
    else meanH = h1 + h2 < 360 ? (h1 + h2 + 360) / 2 : (h1 + h2 - 360) / 2
  }

  const t =
    1 -
    0.17 * Math.cos((meanH - 30) * RAD) +
    0.24 * Math.cos(2 * meanH * RAD) +
    0.32 * Math.cos((3 * meanH + 6) * RAD) -
    0.2 * Math.cos((4 * meanH - 63) * RAD)
  const sL = 1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2)
  const sC = 1 + 0.045 * meanC
  const sH = 1 + 0.015 * meanC * t
  const rotation =
    -2 *
    Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)) *
    Math.sin(60 * Math.exp(-(((meanH - 275) / 25) ** 2)) * RAD)

  const lTerm = dL / (kL * sL)
  const cTerm = dC / sC
  const hTerm = dH / sH
  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rotation * cTerm * hTerm)
}
