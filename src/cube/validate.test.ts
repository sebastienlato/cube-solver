import { describe, expect, it } from 'vitest'
import { SOLVED, facelet, replaceAt, type Face } from './facelets'
import { applyMoves, mulberry32, randomScramble, randomState } from './state'
import { validate, type IssueCode } from './validate'

/** Repaints stickers of the solved cube, e.g. `paint({ U9: 'D' })`. */
function paint(changes: Record<string, Face>, from = SOLVED): string {
  return Object.entries(changes).reduce(
    (state, [name, face]) => replaceAt(state, facelet(name[0] as Face, Number(name[1])), face),
    from,
  )
}

const issue = (state: string, code: IssueCode) => validate(state).issues.find((i) => i.code === code)
const codes = (state: string) => validate(state).issues.map((i) => i.code)

describe('validate', () => {
  it('accepts the solved cube and any scrambled cube', () => {
    expect(validate(SOLVED)).toEqual({ valid: true, issues: [] })
    const rng = mulberry32(5)
    for (let i = 0; i < 200; i++) {
      expect(validate(randomState(rng)).valid).toBe(true)
      expect(validate(applyMoves(SOLVED, randomScramble(25, rng))).valid).toBe(true)
    }
  })

  it('rejects strings that are not 54 face letters', () => {
    expect(codes('UUU')).toEqual(['format'])
    expect(codes(SOLVED.replace('U', 'X'))).toEqual(['format'])
  })

  it('reports a center that is out of place', () => {
    const state = paint({ U5: 'D', D5: 'U' })
    expect(issue(state, 'centers')?.message).toMatch(/^The top and bottom centers are not in place\./)
    expect(issue(state, 'centers')?.facelets).toEqual([facelet('U', 5), facelet('D', 5)])
  })

  it('explains a color count that is off by one sticker', () => {
    const state = paint({ D1: 'U' })
    const count = issue(state, 'count')
    expect(count?.message).toBe(
      'There are 10 white stickers and 8 yellow. One white sticker is probably yellow.',
    )
    // The extra white sits on the piece that became impossible, so it is singled out.
    expect(count?.facelets).toEqual([facelet('D', 1)])
    expect(validate(state).issues[0].code).toBe('count')
  })

  it('explains counts that are off in several colors', () => {
    const state = paint({ D1: 'U', D3: 'U', F1: 'R' })
    expect(issue(state, 'count')?.message).toBe(
      'There are 11 white stickers, 10 red, 8 green and 7 yellow. Every color needs exactly 9.',
    )
  })

  it('reports an edge with the same color twice', () => {
    // Trade the front sticker of the top-front edge with the top sticker of the top-right edge.
    const state = paint({ F2: 'U', U6: 'F' })
    expect(issue(state, 'count')).toBeUndefined()
    const bad = issue(state, 'edge-impossible')
    expect(bad?.message).toBe(
      'The top-front edge has two white stickers. Every sticker on a piece is a different color.',
    )
    expect(bad?.facelets).toEqual([facelet('U', 8), facelet('F', 2)])
  })

  it('reports an edge with colors from opposite faces', () => {
    const state = paint({ F2: 'D', D2: 'F' })
    expect(issue(state, 'edge-impossible')?.message).toBe(
      'The top-front edge has white and yellow, which sit on opposite faces. No such piece exists.',
    )
  })

  it('reports an edge that appears twice and names the missing one', () => {
    const state = paint({ F2: 'R' })
    const duplicate = issue(state, 'edge-duplicate')
    expect(duplicate?.message).toBe(
      'The white and red edge appears twice. One of them is probably the white and green edge, which is missing.',
    )
    expect(duplicate?.facelets.sort((a, b) => a - b)).toEqual(
      [facelet('U', 6), facelet('R', 2), facelet('U', 8), facelet('F', 2)].sort((a, b) => a - b),
    )
  })

  it('reports a corner with the same color twice or with opposite colors', () => {
    expect(issue(paint({ U9: 'R' }), 'corner-impossible')?.message).toBe(
      'The top-front-right corner has two red stickers. Every sticker on a piece is a different color.',
    )
    expect(issue(paint({ U9: 'L' }), 'corner-impossible')?.message).toBe(
      'The top-front-right corner has orange and red, which sit on opposite faces. No such piece exists.',
    )
  })

  it('reports a corner whose colors run in mirror-image order', () => {
    const state = paint({ R1: 'F', F3: 'R' })
    expect(issue(state, 'count')).toBeUndefined()
    const mirrored = issue(state, 'corner-mirrored')
    expect(mirrored?.message).toBe(
      'The top-front-right corner has white, green and red in mirror-image order. Two of its stickers are probably swapped.',
    )
    expect(mirrored?.facelets).toEqual([facelet('U', 9), facelet('R', 1), facelet('F', 3)])
  })

  it('reports a corner that appears twice', () => {
    const state = paint({ R1: 'F', F3: 'L' })
    expect(issue(state, 'corner-duplicate')?.message).toBe(
      'The white, green and orange corner appears twice. One of them is probably the white, red and green corner, which is missing.',
    )
  })

  it('reports a corner twisted in place', () => {
    const state = paint({ U9: 'R', R1: 'F', F3: 'U' })
    expect(codes(state)).toEqual(['corner-twist'])
    expect(validate(state).issues[0].message).toMatch(
      /^One corner is twisted in place\. This position can't be reached by turning the cube/,
    )
  })

  it('reports an edge flipped in place', () => {
    const state = paint({ U8: 'F', F2: 'U' })
    expect(codes(state)).toEqual(['edge-flip'])
    expect(validate(state).issues[0].message).toMatch(/^One edge is flipped in place\./)
  })

  it('reports two swapped pieces', () => {
    const state = paint({ F2: 'R', R2: 'F' })
    expect(codes(state)).toEqual(['parity'])
    expect(validate(state).issues[0].message).toMatch(/^Two pieces have traded places\./)
  })

  it('reports twist, flip and parity together when all three are wrong', () => {
    const state = paint({ U9: 'R', R1: 'F', F3: 'U', U8: 'F', F2: 'U', B2: 'L', L2: 'B' })
    expect(codes(state)).toEqual(['corner-twist', 'edge-flip', 'parity'])
  })

  it('uses the color names it is given', () => {
    const names = { U: 'pink', R: 'red', F: 'green', D: 'purple', L: 'orange', B: 'blue' }
    expect(validate(paint({ D1: 'U' }), names).issues[0].message).toBe(
      'There are 10 pink stickers and 8 purple. One pink sticker is probably purple.',
    )
  })
})
