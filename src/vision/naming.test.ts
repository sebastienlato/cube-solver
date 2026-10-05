import { describe, expect, it } from 'vitest'
import { DEFAULT_SCHEME, STICKER_COLORS } from '../cube/scheme'
import { hexToLab } from './color'
import { cleanScheme, nameFaceColors, nameScheme } from './naming'

describe('color naming', () => {
  it('names the default scheme', () => {
    expect(nameScheme(DEFAULT_SCHEME)).toEqual({
      U: 'white',
      R: 'red',
      F: 'green',
      D: 'yellow',
      L: 'orange',
      B: 'blue',
    })
  })

  it('follows the scheme when faces carry other colors', () => {
    const names = nameScheme({ ...DEFAULT_SCHEME, U: STICKER_COLORS.yellow, D: STICKER_COLORS.white })
    expect(names.U).toBe('yellow')
    expect(names.D).toBe('white')
  })

  it('uses each name once even when two measured colors are close', () => {
    // A dull orange and a red that both sit nearest to "red" on their own.
    const names = nameFaceColors({
      U: hexToLab('#e9e7e0'),
      R: hexToLab('#b3261e'),
      F: hexToLab('#2d8a4e'),
      D: hexToLab('#d9c23a'),
      L: hexToLab('#c9461c'),
      B: hexToLab('#274f9e'),
    })
    expect(new Set(Object.values(names)).size).toBe(6)
    expect(names.R).toBe('red')
    expect(names.L).toBe('orange')
  })

  it('cleans measured colors toward their reference without replacing them', () => {
    const muddy = { U: '#c9c5ba', R: '#a8322c', F: '#2f7d4d', D: '#c4ae3c', L: '#c56a28', B: '#2c4f8f' }
    const labs = Object.fromEntries(Object.entries(muddy).map(([face, hex]) => [face, hexToLab(hex)]))
    const cleaned = cleanScheme(labs as Parameters<typeof cleanScheme>[0])
    for (const face of ['U', 'R', 'F', 'D', 'L', 'B'] as const) {
      expect(cleaned[face]).toMatch(/^#[0-9a-f]{6}$/)
      expect(cleaned[face]).not.toBe(muddy[face])
    }
    // The white center ends up lighter than it was measured.
    expect(hexToLab(cleaned.U)[0]).toBeGreaterThan(hexToLab(muddy.U)[0])
  })
})
