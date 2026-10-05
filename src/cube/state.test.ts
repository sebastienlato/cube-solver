import Cube from 'cubejs'
import { describe, expect, it } from 'vitest'
import { CORNERS, EDGES, SOLVED } from './facelets'
import { FACELET_GEOMETRY } from './geometry'
import { ALL_MOVES, invertAlg, parseAlg } from './moves'
import { applyMove, applyMoves, isSolved, mulberry32, randomScramble, randomState, statesAlong } from './state'
import { validate } from './validate'

describe('facelet geometry', () => {
  it('puts all stickers of a corner or edge on the same cubie', () => {
    for (const piece of [...CORNERS, ...EDGES]) {
      const cubies = new Set(piece.facelets.map((i) => FACELET_GEOMETRY[i].position.join(',')))
      expect(cubies.size, piece.name).toBe(1)
    }
  })

  it('gives every sticker a distinct place', () => {
    const places = new Set(FACELET_GEOMETRY.map((g) => `${g.position}|${g.normal}`))
    expect(places.size).toBe(54)
  })
})

describe('applyMove', () => {
  it('returns to solved after any move four times', () => {
    for (const move of ALL_MOVES) {
      expect(applyMoves(SOLVED, [move, move, move, move]), move).toBe(SOLVED)
    }
  })

  it('changes the cube on a single move', () => {
    for (const move of ALL_MOVES) expect(isSolved(applyMove(SOLVED, move)), move).toBe(false)
  })

  it("returns to solved after R U R' U' six times", () => {
    const sexy = parseAlg("R U R' U'")
    expect(applyMoves(SOLVED, Array(6).fill(sexy).flat())).toBe(SOLVED)
  })

  it('treats a double turn as two quarter turns and a prime as three', () => {
    for (const face of ['U', 'R', 'F', 'D', 'L', 'B'] as const) {
      expect(applyMove(SOLVED, `${face}2`)).toBe(applyMoves(SOLVED, [face, face]))
      expect(applyMove(SOLVED, `${face}'`)).toBe(applyMoves(SOLVED, [face, face, face]))
    }
  })

  it('moves the front-right corner sticker the right way on U', () => {
    // After U, the right face's top row shows what was on the back face.
    expect(applyMove(SOLVED, 'U').slice(9, 12)).toBe('BBB')
    expect(applyMove(SOLVED, 'U').slice(18, 21)).toBe('RRR')
  })

  it('is undone by the inverse sequence', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const scramble = randomScramble(30, rng)
      expect(applyMoves(applyMoves(SOLVED, scramble), invertAlg(scramble))).toBe(SOLVED)
    }
  })

  it('agrees with cubejs on random sequences', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 300; i++) {
      const scramble = randomScramble(1 + Math.floor(rng() * 40), rng)
      expect(applyMoves(SOLVED, scramble), scramble.join(' ')).toBe(new Cube().move(scramble.join(' ')).asString())
    }
  })

  it('lists every state along a sequence', () => {
    const moves = parseAlg("R U2 F'")
    const states = statesAlong(SOLVED, moves)
    expect(states).toHaveLength(4)
    expect(states[0]).toBe(SOLVED)
    expect(states[3]).toBe(applyMoves(SOLVED, moves))
  })
})

describe('randomScramble', () => {
  it('never turns the same face twice in a row or one axis three times', () => {
    const rng = mulberry32(3)
    const opposite: Record<string, string> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' }
    for (let i = 0; i < 100; i++) {
      const faces = randomScramble(25, rng).map((m) => m[0])
      for (let k = 1; k < faces.length; k++) {
        expect(faces[k]).not.toBe(faces[k - 1])
        if (k >= 2 && opposite[faces[k]] === faces[k - 1]) expect(faces[k - 2]).not.toBe(faces[k])
      }
    }
  })
})

describe('randomState', () => {
  it('always produces a valid cube that cubejs reads back unchanged', () => {
    const rng = mulberry32(11)
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const state = randomState(rng)
      seen.add(state)
      expect(validate(state).issues).toEqual([])
      expect(Cube.fromString(state).asString()).toBe(state)
    }
    expect(seen.size).toBe(300)
  })
})
