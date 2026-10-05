import { describe, expect, it } from 'vitest'
import { applyGains, balancePhotos, grayWorldGains, whitePatchGains } from './balance'
import type { RGB } from './color'

const WHITE: RGB = [0.8, 0.8, 0.78]
const RED: RGB = [0.5, 0.02, 0.02]
const BLUE: RGB = [0.02, 0.09, 0.45]
const YELLOW: RGB = [0.75, 0.6, 0.03]
const tint = (color: RGB, cast: RGB): RGB => [color[0] * cast[0], color[1] * cast[1], color[2] * cast[2]]

describe('white balance', () => {
  it('makes a tinted white sticker neutral again', () => {
    const cast: RGB = [1.1, 1, 0.88]
    const photo = [WHITE, RED, BLUE, YELLOW].map((c) => tint(c, cast))
    const gains = whitePatchGains(photo)
    expect(gains).not.toBeNull()
    const [r, g, b] = applyGains(photo[0], gains as RGB)
    expect(r).toBeCloseTo(g, 6)
    expect(g).toBeCloseTo(b, 6)
  })

  it('brings two differently exposed photos to the same white level', () => {
    const bright = whitePatchGains([WHITE, RED]) as RGB
    const dim = whitePatchGains([tint(WHITE, [0.4, 0.4, 0.4]), tint(RED, [0.4, 0.4, 0.4])]) as RGB
    expect(applyGains(WHITE, bright)[1]).toBeCloseTo(applyGains(tint(WHITE, [0.4, 0.4, 0.4]), dim)[1], 6)
  })

  it('does not mistake a dark, dull sticker for white', () => {
    // A blue sticker in deep shadow is low in chroma in absolute terms, but far too dark to be the white reference.
    const shadow: RGB = [0.012, 0.014, 0.018]
    expect(whitePatchGains([shadow, RED, YELLOW])).toBeNull()
  })

  it('finds no white reference in a photo of colored faces only', () => {
    expect(whitePatchGains([RED, BLUE, YELLOW])).toBeNull()
  })

  it('borrows the other photo’s balance when one photo has no white', () => {
    const cast: RGB = [1.08, 1, 0.9]
    const withWhite = [WHITE, RED, BLUE].map((c) => tint(c, cast))
    const colorsOnly = [RED, BLUE, YELLOW].map((c) => tint(c, cast))
    const [first, second] = balancePhotos(colorsOnly, withWhite)
    expect(first.method).toBe('borrowed')
    expect(second.method).toBe('white-patch')
    expect(first.gains).toEqual(second.gains)
  })

  it('falls back to gray-world over both photos when neither has white', () => {
    const [first, second] = balancePhotos([RED, BLUE], [YELLOW, BLUE])
    expect(first.method).toBe('gray-world')
    expect(second.method).toBe('gray-world')
    expect(first.gains).toEqual(second.gains)
  })

  it('computes gray-world gains that equalize the channel means', () => {
    const samples = [RED, BLUE, YELLOW]
    const gains = grayWorldGains(samples)
    const balanced = samples.map((s) => applyGains(s, gains))
    const mean = (c: number) => balanced.reduce((sum, s) => sum + s[c], 0) / balanced.length
    expect(mean(0)).toBeCloseTo(mean(1), 6)
    expect(mean(1)).toBeCloseTo(mean(2), 6)
  })
})
