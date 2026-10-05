import { describe, expect, it } from 'vitest'
import { applyColor, nextSticker, paintSticker, swapCenterColors } from './edit'
import { SOLVED, centerIndex, facelet } from './facelets'
import { DEFAULT_SCHEME } from './scheme'
import { applyMoves, mulberry32, randomState } from './state'
import { validate } from './validate'

const solved = { facelets: SOLVED, colors: DEFAULT_SCHEME }

/** The colors a person would see, sticker by sticker. */
const seen = (cube: typeof solved) => [...cube.facelets].map((letter) => cube.colors[letter as 'U'])

describe('editing a cube', () => {
  it('paints one sticker', () => {
    const edited = paintSticker(solved, facelet('U', 1), 'F')
    expect(edited.facelets[0]).toBe('F')
    expect(edited.facelets.slice(1)).toBe(SOLVED.slice(1))
  })

  it('never repaints a center through paintSticker', () => {
    expect(paintSticker(solved, centerIndex('U'), 'F')).toBe(solved)
  })

  it('swaps two center colors and keeps every other sticker looking the same', () => {
    const cube = { facelets: applyMoves(SOLVED, ['R', 'U', "F'", 'D2']), colors: DEFAULT_SCHEME }
    const before = seen(cube)
    const swapped = swapCenterColors(cube, 'U', 'D')
    const after = seen(swapped)
    expect(swapped.colors.U).toBe(DEFAULT_SCHEME.D)
    expect(swapped.colors.D).toBe(DEFAULT_SCHEME.U)
    for (let i = 0; i < 54; i++) {
      if (i === centerIndex('U')) expect(after[i]).toBe(DEFAULT_SCHEME.D)
      else if (i === centerIndex('D')) expect(after[i]).toBe(DEFAULT_SCHEME.U)
      else expect(after[i], `sticker ${i}`).toBe(before[i])
    }
  })

  it('keeps centers on their own letters after a swap', () => {
    const swapped = swapCenterColors(solved, 'R', 'B')
    for (const face of ['U', 'R', 'F', 'D', 'L', 'B'] as const) {
      expect(swapped.facelets[centerIndex(face)]).toBe(face)
    }
  })

  it('is undone by swapping back', () => {
    const cube = { facelets: randomState(mulberry32(1)), colors: DEFAULT_SCHEME }
    expect(swapCenterColors(swapCenterColors(cube, 'F', 'L'), 'F', 'L')).toEqual(cube)
  })

  it('routes a color choice to a paint or a center swap', () => {
    expect(applyColor(solved, facelet('F', 1), 'R').facelets[facelet('F', 1)]).toBe('R')
    const swapped = applyColor(solved, centerIndex('F'), 'B')
    expect(swapped.colors.F).toBe(DEFAULT_SCHEME.B)
    // The two faces still look green and blue, but each now surrounds the other's center.
    expect(validate(swapped.facelets).valid).toBe(false)
  })

  it('walks through all 48 editable stickers in net order', () => {
    let index: number | null = facelet('U', 1)
    const visited: number[] = []
    while (index !== null) {
      visited.push(index)
      index = nextSticker(index)
    }
    expect(visited).toHaveLength(48)
    expect(new Set(visited).size).toBe(48)
    expect(visited[8]).toBe(facelet('L', 1))
    expect(visited[47]).toBe(facelet('D', 9))
    expect(nextSticker(centerIndex('U'))).toBeNull()
  })
})
