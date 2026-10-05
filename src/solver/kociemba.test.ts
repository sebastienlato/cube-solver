import { beforeAll, describe, expect, it } from 'vitest'
import { SOLVED, facelet, replaceAt } from '../cube/facelets'
import { applyMoves, mulberry32, randomScramble, randomState } from '../cube/state'
import { initSolver, solve } from './kociemba'
import { SHORT_SOLUTION_LIMIT } from './shortSolve'

describe('solver', () => {
  beforeAll(() => initSolver())

  it('solves 500 random scrambles in at most 24 moves each', () => {
    const rng = mulberry32(2024)
    let longest = 0
    for (let i = 0; i < 500; i++) {
      // Alternate hand-style scrambles with uniformly random positions.
      const state = i % 2 === 0 ? applyMoves(SOLVED, randomScramble(25, rng)) : randomState(rng)
      const solution = solve(state)
      expect(applyMoves(state, solution), `scramble ${i}`).toBe(SOLVED)
      expect(solution.length).toBeLessThanOrEqual(24)
      longest = Math.max(longest, solution.length)
    }
    expect(longest).toBeGreaterThan(15)
  })

  it('returns no moves for a solved cube', () => {
    expect(solve(SOLVED)).toEqual([])
  })

  it('solves a cube that is one move from solved', () => {
    expect(solve(applyMoves(SOLVED, ['R']))).toEqual(["R'"])
  })

  it('never needs more moves than a short scramble took', () => {
    const rng = mulberry32(99)
    for (let length = 1; length <= SHORT_SOLUTION_LIMIT; length++) {
      for (let i = 0; i < 12; i++) {
        const state = applyMoves(SOLVED, randomScramble(length, rng))
        const solution = solve(state)
        expect(applyMoves(state, solution)).toBe(SOLVED)
        expect(solution.length).toBeLessThanOrEqual(length)
      }
    }
  })

  it('refuses a cube that cannot be solved', () => {
    const flipped = replaceAt(replaceAt(SOLVED, facelet('U', 8), 'F'), facelet('F', 2), 'U')
    expect(() => solve(flipped)).toThrow(/One edge is flipped in place/)
  })
})
