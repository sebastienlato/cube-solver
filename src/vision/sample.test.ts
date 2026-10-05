import { describe, expect, it } from 'vitest'
import { SOLVED } from '../cube/facelets'
import { NEUTRAL_LIGHTING, PHOTO_COLORS, renderCornerPhoto } from '../test/renderer'
import { linearToSrgb } from './color'
import { sampleCells } from './sample'
import { PHOTO_1_VIEW, cellIndex } from './views'

const render = (lighting = NEUTRAL_LIGHTING) =>
  renderCornerPhoto(SOLVED, { width: 400, height: 400, rotation: PHOTO_1_VIEW.rotation, distance: 14, fill: 0.8, lighting })

describe('sampleCells', () => {
  it('returns 27 colors, nine per visible face', () => {
    const { image, handles } = render({ ...NEUTRAL_LIGHTING, shading: [1, 1, 1] })
    const samples = sampleCells(image, handles)
    expect(samples).toHaveLength(27)
    const faces = ['U', 'F', 'R'] as const
    faces.forEach((face, quad) => {
      for (let k = 0; k < 9; k++) {
        const srgb = samples[quad * 9 + k].map((c) => Math.round(linearToSrgb(c)))
        srgb.forEach((value, c) => expect(Math.abs(value - PHOTO_COLORS[face][c])).toBeLessThanOrEqual(1))
      }
    })
  })

  it('ignores a highlight that covers less than half of a sticker', () => {
    const plain = render()
    const cell = cellIndex(0, 0, 2)
    const clean = sampleCells(plain.image, plain.handles)[cell]

    // Burn a white dot into the middle of one sticker.
    const { TR, T, C } = plain.handles
    const center = { x: (TR.x * 2 + (T.x + C.x) / 2) / 3 + (C.x - TR.x) * 0.02, y: (TR.y * 2 + (T.y + C.y) / 2) / 3 }
    const { image } = plain
    for (let y = Math.round(center.y) - 4; y <= Math.round(center.y) + 4; y++) {
      for (let x = Math.round(center.x) - 4; x <= Math.round(center.x) + 4; x++) {
        const offset = (y * image.width + x) * 4
        image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = 255
      }
    }
    const withDot = sampleCells(image, plain.handles)[cell]
    withDot.forEach((value, c) => expect(value).toBeCloseTo(clean[c], 2))
  })

  it('stays inside the image when a handle is dragged off the edge', () => {
    const { image, handles } = render()
    const off = { ...handles, T: { x: handles.T.x, y: -80 }, BR: { x: image.width + 60, y: handles.BR.y } }
    const samples = sampleCells(image, off)
    expect(samples.every((sample) => sample.every((c) => Number.isFinite(c)))).toBe(true)
  })
})
