import { describe, expect, it } from 'vitest'
import { ALL_MOVES, describeMove, displayMove, invertAlg, invertMove, parseAlg, parseMove, spokenMove } from './moves'

describe('move notation', () => {
  it('parses faces and suffixes', () => {
    expect(parseMove('R')).toEqual({ face: 'R', turns: 1 })
    expect(parseMove('U2')).toEqual({ face: 'U', turns: 2 })
    expect(parseMove("F'")).toEqual({ face: 'F', turns: 3 })
  })

  it('rejects anything that is not a face turn', () => {
    for (const bad of ['', 'X', 'R3', "R'2", 'r', 'undefined']) expect(() => parseMove(bad), bad).toThrow()
  })

  it('parses a sequence and ignores extra spaces', () => {
    expect(parseAlg("  R U  R' U2 ")).toEqual(['R', 'U', "R'", 'U2'])
    expect(parseAlg('')).toEqual([])
  })

  it('inverts moves and sequences', () => {
    expect(invertMove('R')).toBe("R'")
    expect(invertMove("R'")).toBe('R')
    expect(invertMove('R2')).toBe('R2')
    expect(invertAlg(['R', 'U2', "F'"])).toEqual(['F', 'U2', "R'"])
  })

  it('lists all 18 moves', () => {
    expect(new Set(ALL_MOVES).size).toBe(18)
  })
})

describe('plain-language descriptions', () => {
  it('describes quarter turns from the point of view of the face', () => {
    expect(describeMove('R').instruction).toBe(
      'Turn the right face clockwise, as if you were looking straight at it',
    )
    expect(describeMove("B'").instruction).toBe(
      'Turn the back face counterclockwise, as if you were looking straight at it',
    )
  })

  it('describes half turns without a direction', () => {
    expect(describeMove('U2').instruction).toBe('Turn the top face twice')
  })

  it('gives opposite hints for a move and its inverse', () => {
    for (const face of ['U', 'R', 'F', 'D', 'L', 'B'] as const) {
      expect(describeMove(face).hint).not.toBe(describeMove(`${face}'`).hint)
    }
    expect(describeMove('R').hint).toBe('The front edge moves up.')
    expect(describeMove('L').hint).toBe('The front edge moves down.')
    expect(describeMove('U').hint).toBe('The front row moves to the left.')
  })

  it('formats notation for the eye and for the ear', () => {
    expect(displayMove("R'")).toBe('R′')
    expect(displayMove('F2')).toBe('F2')
    expect(spokenMove("R'")).toBe('R prime')
    expect(spokenMove('F2')).toBe('F 2')
  })
})
