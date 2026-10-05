import { describe, expect, it } from 'vitest'
import { SOLVED, facelet, replaceAt, type Face } from '../cube/facelets'
import { CUBE_ROTATIONS, applyMat3, type Mat3 } from '../cube/geometry'
import { applyMoves, mulberry32, randomScramble, randomState, type Rng } from '../cube/state'
import { NEUTRAL_LIGHTING, PHOTO_COLORS, randomLighting, renderCornerPhoto, type Lighting } from '../test/renderer'
import { scanPhotos, type PhotoInput } from './pipeline'
import { HANDLE_NAMES, PHOTO_1_VIEW, PHOTO_2_VIEWS, type Handles } from './views'

const SIZE = 480

interface Shot {
  lighting?: Lighting
  seed?: number
  width?: number
  height?: number
  colors?: Record<Face, readonly [number, number, number]>
  logo?: { face: Face; color: readonly [number, number, number] }
}

/** A photo of whichever corner the given rotation brings in front of the camera. */
function photographPose(state: string, rotation: Mat3, shot: Shot = {}): PhotoInput {
  return renderCornerPhoto(state, {
    width: SIZE,
    height: SIZE,
    rotation,
    distance: 14,
    fill: 0.8,
    lighting: shot.lighting ?? NEUTRAL_LIGHTING,
    seed: shot.seed,
  })
}

/** Photo 1 (the U-F-R corner) or photo 2 held with `PHOTO_2_VIEWS[hold]`. */
function photograph(state: string, hold: number | 'first', shot: Shot = {}): PhotoInput {
  const view = hold === 'first' ? PHOTO_1_VIEW : PHOTO_2_VIEWS[hold]
  return renderCornerPhoto(state, {
    width: shot.width ?? SIZE,
    height: shot.height ?? SIZE,
    rotation: view.rotation,
    distance: 14,
    fill: 0.8,
    lighting: shot.lighting ?? NEUTRAL_LIGHTING,
    seed: shot.seed,
    colors: shot.colors,
    logo: shot.logo,
  })
}

/** Moves every handle by up to `pixels` in each direction, like a user who lined them up by eye. */
function nudge(handles: Handles, pixels: number, rng: Rng): Handles {
  return Object.fromEntries(
    HANDLE_NAMES.map((name) => [
      name,
      { x: handles[name].x + (rng() * 2 - 1) * pixels, y: handles[name].y + (rng() * 2 - 1) * pixels },
    ]),
  ) as Handles
}

describe('vision pipeline, synthetic round trip', () => {
  it('recovers 200 random cubes for all three ways of holding photo 2, with exact and nudged handles', () => {
    const rng = mulberry32(2025)
    let exact = 0
    let nudged = 0
    let trials = 0
    for (let cube = 0; cube < 200; cube++) {
      const state = randomState(rng)
      for (let hold = 0; hold < 3; hold++) {
        trials++
        const first = photograph(state, 'first', { lighting: randomLighting(rng, SIZE, SIZE), seed: cube * 7 + hold })
        const second = photograph(state, hold, { lighting: randomLighting(rng, SIZE, SIZE), seed: cube * 13 + hold + 1 })

        const result = scanPhotos(first, second)
        if (result.ok && result.facelets === state && result.validation.valid && result.variant === hold) exact++

        const loose = scanPhotos(
          { image: first.image, handles: nudge(first.handles, 4, rng) },
          { image: second.image, handles: nudge(second.handles, 4, rng) },
        )
        if (loose.ok && loose.facelets === state) nudged++
      }
    }
    expect(trials).toBe(600)
    expect(exact).toBe(600)
    expect(nudged).toBe(600)
  })

  it('works at other image sizes and shapes', () => {
    const rng = mulberry32(8)
    for (const [width, height] of [
      [1280, 960],
      [600, 900],
      [320, 320],
    ]) {
      const state = randomState(rng)
      const first = photograph(state, 'first', { width, height, lighting: randomLighting(rng, width, height) })
      const second = photograph(state, 1, { width, height, lighting: randomLighting(rng, width, height) })
      const result = scanPhotos(first, second)
      expect(result.ok && result.facelets, `${width}×${height}`).toBe(state)
    }
  })

  it('finds the measured center colors and gives each face a clean display color', () => {
    const state = randomState(mulberry32(4))
    const result = scanPhotos(photograph(state, 'first'), photograph(state, 0))
    if (!result.ok) throw new Error(result.message)
    // White is the lightest face color and has almost no chroma.
    expect(result.faceColors.U[0]).toBeGreaterThan(result.faceColors.B[0])
    expect(Math.hypot(result.faceColors.U[1], result.faceColors.U[2])).toBeLessThan(8)
    expect(result.colors.U).toMatch(/^#[0-9a-f]{6}$/)
    expect(new Set(Object.values(result.colors)).size).toBe(6)
  })
})

describe('vision pipeline, awkward cubes', () => {
  it('reads cubes that are solved or nearly solved, where one photo has no white sticker', () => {
    const rng = mulberry32(31)
    let borrowed = 0
    for (let trial = 0; trial < 40; trial++) {
      const state = applyMoves(SOLVED, randomScramble(trial % 4, rng))
      const hold = trial % 3
      const first = photograph(state, 'first', { lighting: randomLighting(rng, SIZE, SIZE), seed: trial })
      const second = photograph(state, hold, { lighting: randomLighting(rng, SIZE, SIZE), seed: trial + 100 })
      const result = scanPhotos(first, second)
      if (!result.ok) throw new Error(`${trial}: ${result.message}`)
      expect(result.facelets, `scramble ${trial}`).toBe(state)
      if (result.balance.some((b) => b.method === 'borrowed')) borrowed++
    }
    expect(borrowed).toBeGreaterThan(0)
  })

  it('is not thrown by a logo printed on the white center', () => {
    const rng = mulberry32(12)
    for (let trial = 0; trial < 20; trial++) {
      const state = randomState(rng)
      const logo = { face: 'U' as Face, color: [30, 60, 170] as const }
      const first = photograph(state, 'first', { logo, lighting: randomLighting(rng, SIZE, SIZE), seed: trial })
      const second = photograph(state, trial % 3, { logo, lighting: randomLighting(rng, SIZE, SIZE), seed: trial + 50 })
      const result = scanPhotos(first, second)
      expect(result.ok && result.facelets, `cube ${trial}`).toBe(state)
    }
  })

  it('copes with one photo being much darker than the other', () => {
    const rng = mulberry32(77)
    for (let trial = 0; trial < 20; trial++) {
      const state = randomState(rng)
      const dim = { ...randomLighting(rng, SIZE, SIZE), exposure: 0.4 }
      const first = photograph(state, 'first', { lighting: randomLighting(rng, SIZE, SIZE), seed: trial })
      const second = photograph(state, trial % 3, { lighting: dim, seed: trial + 9 })
      const result = scanPhotos(first, second)
      expect(result.ok && result.facelets, `cube ${trial}`).toBe(state)
    }
  })

  it('still reads the stickers of a cube that is not solvable, and says it is not valid', () => {
    const rng = mulberry32(5)
    const valid = randomState(rng)
    // Flip one edge in place: every sticker color is still right, but the cube can't be solved.
    const flipped = replaceAt(replaceAt(valid, facelet('U', 8), valid[facelet('F', 2)] as Face), facelet('F', 2), valid[facelet('U', 8)] as Face)
    const result = scanPhotos(photograph(flipped, 'first'), photograph(flipped, 2))
    if (!result.ok) throw new Error(result.message)
    expect(result.facelets).toBe(flipped)
    expect(result.validation.valid).toBe(false)
    expect(result.validation.issues[0].code).toBe('edge-flip')
  })

  it('flags few stickers as low confidence on a clean scan', () => {
    const state = randomState(mulberry32(21))
    const result = scanPhotos(photograph(state, 'first'), photograph(state, 0))
    if (!result.ok) throw new Error(result.message)
    expect(result.lowConfidence).toEqual([])
    expect(result.confidence.filter((gap) => gap === Infinity)).toHaveLength(6)
  })
})

describe('vision pipeline, photos that need retaking', () => {
  it('notices when photo 2 shows the same corner as photo 1, however it is held', () => {
    const rng = mulberry32(9)
    for (let trial = 0; trial < 30; trial++) {
      const state = randomState(rng)
      const first = photograph(state, trial % 3, { lighting: randomLighting(rng, SIZE, SIZE), seed: trial })
      const again = photograph(state, (trial + 1 + (trial % 2)) % 3, { lighting: randomLighting(rng, SIZE, SIZE), seed: trial + 40 })
      const result = scanPhotos(first, { image: again.image, handles: nudge(again.handles, 3, rng) })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.code).toBe('same-corner')
        expect(result.photo).toBe(2)
        expect(result.message).toMatch(/already in photo 1/)
      }
    }
  })

  it('notices when photo 2 shows any corner that shares a face with photo 1', () => {
    const rng = mulberry32(14)
    const state = randomState(rng)
    const first = photograph(state, 'first')
    // Every pose except the three of the opposite corner shows one, two or three faces again.
    const repeats = CUBE_ROTATIONS.filter((rotation) => applyMat3(rotation, [-1, -1, -1]).some((c) => c !== 1))
    expect(repeats).toHaveLength(21)
    for (const rotation of repeats) {
      const second = photographPose(state, rotation, { lighting: randomLighting(rng, SIZE, SIZE), seed: 3 })
      const result = scanPhotos(first, second)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.code).toBe('same-corner')
    }
  })

  it('reports two centers that look alike within one photo, and can continue past it', () => {
    const state = randomState(mulberry32(6))
    // A cube whose front stickers are printed almost the same white as its top ones.
    const colors = { ...PHOTO_COLORS, F: [228, 228, 222] as const }
    const first = photograph(state, 'first', { colors })
    const second = photograph(state, 0, { colors })

    const result = scanPhotos(first, second)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('centers-alike')
      expect(result.photo).toBe(1)
      expect(result.message).toMatch(/^Two center stickers in photo 1 look like the same color\./)
    }

    const forced = scanPhotos(first, second, { allowAlikeCenters: true })
    expect(forced.ok).toBe(true)
  })
})
