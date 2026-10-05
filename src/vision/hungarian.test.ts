import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../cube/state'
import { assign } from './hungarian'

const total = (cost: number[][], columns: number[]) => columns.reduce((sum, column, row) => sum + cost[row][column], 0)

function bruteForce(cost: number[][]): number {
  const n = cost.length
  let best = Infinity
  const walk = (row: number, used: number, sum: number) => {
    if (sum >= best) return
    if (row === n) {
      best = sum
      return
    }
    for (let column = 0; column < n; column++) {
      if (!(used & (1 << column))) walk(row + 1, used | (1 << column), sum + cost[row][column])
    }
  }
  walk(0, 0, 0)
  return best
}

describe('assign', () => {
  it('solves a small textbook case', () => {
    const cost = [
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ]
    const columns = assign(cost)
    expect(total(cost, columns)).toBe(5)
    expect(new Set(columns).size).toBe(3)
  })

  it('matches brute force on random matrices', () => {
    const rng = mulberry32(17)
    for (let trial = 0; trial < 200; trial++) {
      const n = 1 + Math.floor(rng() * 7)
      const cost = Array.from({ length: n }, () => Array.from({ length: n }, () => Math.floor(rng() * 50)))
      const columns = assign(cost)
      expect(new Set(columns).size).toBe(n)
      expect(total(cost, columns)).toBe(bruteForce(cost))
    }
  })

  it('handles the 48×48 size used for stickers', () => {
    const rng = mulberry32(3)
    const cost = Array.from({ length: 48 }, () => Array.from({ length: 48 }, () => rng() * 100))
    const columns = assign(cost)
    expect(new Set(columns).size).toBe(48)
    // No pair of rows can lower the total by trading columns.
    for (let a = 0; a < 48; a++) {
      for (let b = a + 1; b < 48; b++) {
        const now = cost[a][columns[a]] + cost[b][columns[b]]
        const traded = cost[a][columns[b]] + cost[b][columns[a]]
        expect(traded).toBeGreaterThanOrEqual(now - 1e-9)
      }
    }
  })
})
