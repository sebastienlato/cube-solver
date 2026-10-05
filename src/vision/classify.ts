/**
 * Balanced color classification. The six center stickers define the six classes, and the
 * other 48 stickers are assigned so that every class gets exactly eight: a real cube has
 * nine stickers of each color, and insisting on that lets clear stickers settle doubtful ones.
 */
import { ciede2000, type Lab } from './color'
import { assign } from './hungarian'

const ROUNDS = 3
const PER_CLASS = 8
/** The lightness every color is brought to before comparing. */
const REFERENCE_LIGHTNESS = 60

/**
 * Removes brightness from a color, keeping its hue and how saturated it is for its brightness.
 *
 * The three faces in a photo catch the light differently: the same orange can be twice as
 * bright on the top face as on a side face. Scaling the light scales (L + 16), a and b by the
 * same factor, so dividing that factor out leaves a color that is the same in light and shade.
 * The six sticker colors remain distinct without lightness: white by its lack of chroma,
 * the other five by hue.
 */
export function withoutBrightness([l, a, b]: Lab): Lab {
  const factor = (REFERENCE_LIGHTNESS + 16) / (Math.max(0, l) + 16)
  return [REFERENCE_LIGHTNESS, a * factor, b * factor]
}

/** CIEDE2000 between two colors with brightness taken out of both. */
export const colorDistance = (a: Lab, b: Lab): number => ciede2000(withoutBrightness(a), withoutBrightness(b))

export interface Classification {
  /** Class of each sample, as an index into `centers`. */
  labels: number[]
  /** Distance to the nearest other class minus distance to the assigned class. Low or negative means doubtful. */
  confidence: number[]
  /** Final color of each class: the mean of its nine stickers. */
  prototypes: Lab[]
}

const mean = (colors: Lab[]): Lab => [
  colors.reduce((sum, c) => sum + c[0], 0) / colors.length,
  colors.reduce((sum, c) => sum + c[1], 0) / colors.length,
  colors.reduce((sum, c) => sum + c[2], 0) / colors.length,
]

/**
 * @param samples every sticker color
 * @param centers index into `samples` of each class's center sticker
 */
export function classifyBalanced(samples: Lab[], centers: number[]): Classification {
  const classes = centers.length
  const others = samples.map((_, i) => i).filter((i) => !centers.includes(i))
  if (others.length !== classes * PER_CLASS) {
    throw new Error(`Expected ${classes * PER_CLASS} non-center stickers, got ${others.length}`)
  }

  let prototypes = centers.map((i) => samples[i])
  const labels = new Array<number>(samples.length).fill(-1)
  centers.forEach((sample, k) => {
    labels[sample] = k
  })

  for (let round = 0; round < ROUNDS; round++) {
    // One column per seat: each class has eight seats, all at the same price.
    const cost = others.map((i) => {
      const toClass = prototypes.map((prototype) => colorDistance(samples[i], prototype))
      return Array.from({ length: classes * PER_CLASS }, (_, seat) => toClass[Math.floor(seat / PER_CLASS)])
    })
    assign(cost).forEach((seat, row) => {
      labels[others[row]] = Math.floor(seat / PER_CLASS)
    })
    prototypes = prototypes.map((_, k) => mean(samples.filter((_, i) => labels[i] === k)))
  }

  const confidence = samples.map((sample, i) => {
    if (centers.includes(i)) return Infinity
    const distances = prototypes.map((prototype) => colorDistance(sample, prototype))
    const own = distances[labels[i]]
    const nearestOther = Math.min(...distances.filter((_, k) => k !== labels[i]))
    return nearestOther - own
  })

  return { labels, confidence, prototypes }
}
