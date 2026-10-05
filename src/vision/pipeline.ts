/**
 * From two corner photos to a facelet string.
 *
 *   sample 27 stickers per photo → white-balance each photo → Lab → balanced classification
 *   anchored on the six centers → map cells to facelets for each way photo 2 could have been
 *   held → keep the mapping that gives a real cube.
 */
import type { Face } from '../cube/facelets'
import type { ColorScheme } from '../cube/scheme'
import { validate, type ValidationResult } from '../cube/validate'
import { applyGains, balancePhotos, type Balance } from './balance'
import { classifyBalanced, colorDistance } from './classify'
import { linearRgbToLab, type Lab, type RGB } from './color'
import { cleanScheme } from './naming'
import { sampleCells, type Raster } from './sample'
import { CELLS_PER_PHOTO, CENTER_CELLS, PHOTO_1_VIEW, PHOTO_2_VIEWS, QUAD_NAMES, type Handles } from './views'

export interface PhotoInput {
  image: Raster
  handles: Handles
}

/**
 * Two centers closer than this are treated as the same color. In the synthetic lighting tests
 * the closest genuinely different pair, red and orange, never comes nearer than 9.
 */
export const CENTER_SEPARATION = 5

/**
 * A face of photo 2 whose nine stickers are on average this close to a face of photo 1 is
 * the same face seen twice. Comparing whole faces is far more telling than comparing two
 * center stickers: nine matches in a row do not happen by chance on a scrambled cube.
 */
export const FACE_MATCH = 7

/** Stickers whose confidence gap is below this are flagged for a second look in Review. */
export const LOW_CONFIDENCE = 6

export interface ScanSuccess {
  ok: true
  facelets: string
  /** Display color per face, cleaned up from the measured class colors. */
  colors: ColorScheme
  /** Measured color of each face's class, white-balanced, in Lab. */
  faceColors: Record<Face, Lab>
  /** Confidence gap per facelet; Infinity for centers. */
  confidence: number[]
  /** Facelets below the confidence threshold, least confident first. */
  lowConfidence: number[]
  validation: ValidationResult
  /** Which way photo 2 was held: index into PHOTO_2_VIEWS. */
  variant: number
  balance: [Balance, Balance]
}

export interface ScanFailure {
  ok: false
  /** `same-corner`: photo 2 repeats a face from photo 1. `centers-alike`: two centers within one photo look the same. */
  code: 'same-corner' | 'centers-alike'
  message: string
  /** The photo to retake. */
  photo: 1 | 2
}

export type ScanOutcome = ScanSuccess | ScanFailure

/** The four ways a 3×3 grid can be turned: cell index after 0, 1, 2 or 3 quarter turns. */
const GRID_TURNS: number[][] = (() => {
  const turns = [[0, 1, 2, 3, 4, 5, 6, 7, 8]]
  for (let i = 1; i < 4; i++) {
    const previous = turns[i - 1]
    turns.push(previous.map((_, k) => previous[(2 - (k % 3)) * 3 + Math.floor(k / 3)]))
  }
  return turns
})()

/** True when some face of photo 2 is a face of photo 1 seen again, in any rotation. */
function repeatsAFace(samples: Lab[]): boolean {
  for (let first = 0; first < 3; first++) {
    for (let second = 0; second < 3; second++) {
      for (const turn of GRID_TURNS) {
        let total = 0
        for (let k = 0; k < 9; k++) {
          total += colorDistance(samples[first * 9 + k], samples[CELLS_PER_PHOTO + second * 9 + turn[k]])
        }
        if (total / 9 < FACE_MATCH) return true
      }
    }
  }
  return false
}

const SAME_CORNER: ScanFailure = {
  ok: false,
  code: 'same-corner',
  photo: 2,
  message:
    'Photo 2 shows a face that was already in photo 1. Turn the cube upside down so the three hidden faces show, then retake photo 2.',
}

function checkCenters(centers: Lab[]): ScanFailure | null {
  for (let a = 0; a < centers.length; a++) {
    for (let b = a + 1; b < centers.length; b++) {
      if (colorDistance(centers[a], centers[b]) >= CENTER_SEPARATION) continue
      // Centers 0–2 come from photo 1 and 3–5 from photo 2.
      if (a < 3 && b >= 3) return SAME_CORNER
      const photo = a < 3 ? 1 : 2
      return {
        ok: false,
        code: 'centers-alike',
        photo,
        message: `Two center stickers in photo ${photo} look like the same color. Check that the grid sits on the stickers, or retake the photo with more even light.`,
      }
    }
  }
  return null
}

export interface ScanOptions {
  /** Go on even if two centers look alike; the user has seen the warning and will fix stickers in Review. */
  allowAlikeCenters?: boolean
}

/** Runs the pipeline on sticker colors that have already been sampled (linear RGB, 27 per photo). */
export function scanSamples(first: RGB[], second: RGB[], options: ScanOptions = {}): ScanOutcome {
  const balance = balancePhotos(first, second)
  const samples: Lab[] = [
    ...first.map((sample) => linearRgbToLab(applyGains(sample, balance[0].gains))),
    ...second.map((sample) => linearRgbToLab(applyGains(sample, balance[1].gains))),
  ]
  const centers = [...CENTER_CELLS, ...CENTER_CELLS.map((cell) => CELLS_PER_PHOTO + cell)]

  if (repeatsAFace(samples)) return SAME_CORNER
  const failure = checkCenters(centers.map((i) => samples[i]))
  if (failure && !(failure.code === 'centers-alike' && options.allowAlikeCenters)) return failure

  // Colors are classified once: which sticker is which color does not depend on how photo 2 was held.
  const classification = classifyBalanced(samples, centers)
  const totalConfidence = classification.confidence.reduce((sum, c) => sum + (Number.isFinite(c) ? c : 0), 0)

  const candidates = PHOTO_2_VIEWS.map((view, variant) => {
    const faceOfClass: Face[] = [
      ...QUAD_NAMES.map((quad) => PHOTO_1_VIEW.faces[quad]),
      ...QUAD_NAMES.map((quad) => view.faces[quad]),
    ]
    const letters = new Array<Face>(54)
    const confidence = new Array<number>(54)
    const place = (cells: number[], offset: number) =>
      cells.forEach((facelet, cell) => {
        letters[facelet] = faceOfClass[classification.labels[offset + cell]]
        confidence[facelet] = classification.confidence[offset + cell]
      })
    place(PHOTO_1_VIEW.cells, 0)
    place(view.cells, CELLS_PER_PHOTO)
    const facelets = letters.join('')
    return { variant, facelets, confidence, faceOfClass, validation: validate(facelets), totalConfidence }
  })

  // A valid cube wins; among several, higher confidence, then the natural hold (D on top).
  // With none valid, the fewest problems wins and the user sorts out the rest in Review.
  const best = [...candidates].sort(
    (a, b) =>
      a.validation.issues.length - b.validation.issues.length ||
      b.totalConfidence - a.totalConfidence ||
      a.variant - b.variant,
  )[0]

  const faceColors = Object.fromEntries(
    best.faceOfClass.map((face, k) => [face, classification.prototypes[k]]),
  ) as Record<Face, Lab>
  const lowConfidence = best.confidence
    .map((gap, facelet) => ({ gap, facelet }))
    .filter(({ gap }) => gap < LOW_CONFIDENCE)
    .sort((a, b) => a.gap - b.gap)
    .map(({ facelet }) => facelet)

  return {
    ok: true,
    facelets: best.facelets,
    colors: cleanScheme(faceColors),
    faceColors,
    confidence: best.confidence,
    lowConfidence,
    validation: best.validation,
    variant: best.variant,
    balance,
  }
}

/** The full pipeline: two photos and their handle positions in, a cube (or a reason to retake) out. */
export function scanPhotos(first: PhotoInput, second: PhotoInput, options: ScanOptions = {}): ScanOutcome {
  return scanSamples(sampleCells(first.image, first.handles), sampleCells(second.image, second.handles), options)
}
