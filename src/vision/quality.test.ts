import { describe, expect, it } from 'vitest'
import { mulberry32, randomState } from '../cube/state'
import { NEUTRAL_LIGHTING, randomLighting, renderCornerPhoto } from '../test/renderer'
import { assessPhoto } from './quality'
import { PHOTO_1_VIEW, guideHandles } from './views'

const shoot = (exposure: number, seed = 1) => {
  const rng = mulberry32(seed)
  return renderCornerPhoto(randomState(rng), {
    width: 400,
    height: 400,
    rotation: PHOTO_1_VIEW.rotation,
    distance: 14,
    fill: 0.8,
    lighting: { ...randomLighting(rng, 400, 400), exposure },
  })
}

describe('assessPhoto', () => {
  it('passes ordinary indoor photos', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { image, handles } = shoot(0.75 + (seed % 4) * 0.1, seed)
      expect(assessPhoto(image, handles)).toEqual({ tooDark: false, lowContrast: false })
    }
  })

  it('warns when the cube is very dark', () => {
    const { image, handles } = shoot(0.05)
    expect(assessPhoto(image, handles).tooDark).toBe(true)
  })

  it('warns when there is almost no contrast', () => {
    const data = new Uint8ClampedArray(200 * 200 * 4).fill(150)
    const quality = assessPhoto({ data, width: 200, height: 200 }, guideHandles(200, 200))
    expect(quality).toEqual({ tooDark: false, lowContrast: true })
  })

  it('judges the cube, not the background', () => {
    const { image, handles } = renderCornerPhoto(randomState(mulberry32(3)), {
      width: 400,
      height: 400,
      rotation: PHOTO_1_VIEW.rotation,
      distance: 14,
      fill: 0.5,
      lighting: { ...NEUTRAL_LIGHTING, background: [4, 4, 4] },
    })
    expect(assessPhoto(image, handles).tooDark).toBe(false)
  })
})
