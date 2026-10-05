import { describe, expect, it } from 'vitest'
import { applyHomography, homographyBetween, homographyFromUnitSquare, invertHomography, type Quad } from './homography'

const quad: Quad = [
  { x: 120, y: 40 },
  { x: 310, y: 95 },
  { x: 280, y: 330 },
  { x: 60, y: 250 },
]

const close = (p: { x: number; y: number }, x: number, y: number) => {
  expect(p.x).toBeCloseTo(x, 8)
  expect(p.y).toBeCloseTo(y, 8)
}

describe('homography', () => {
  it('maps the unit square corners onto the quad corners', () => {
    const h = homographyFromUnitSquare(quad)
    close(applyHomography(h, 0, 0), 120, 40)
    close(applyHomography(h, 1, 0), 310, 95)
    close(applyHomography(h, 1, 1), 280, 330)
    close(applyHomography(h, 0, 1), 60, 250)
  })

  it('is the identity for the unit square itself', () => {
    const h = homographyFromUnitSquare([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
    close(applyHomography(h, 0.3, 0.8), 0.3, 0.8)
  })

  it('reduces to an affine map for a parallelogram', () => {
    const h = homographyFromUnitSquare([
      { x: 10, y: 10 },
      { x: 50, y: 20 },
      { x: 60, y: 70 },
      { x: 20, y: 60 },
    ])
    close(applyHomography(h, 0.5, 0.5), 35, 40)
  })

  it('keeps straight lines straight', () => {
    const h = homographyFromUnitSquare(quad)
    const a = applyHomography(h, 0.2, 0.1)
    const b = applyHomography(h, 0.5, 0.4)
    const c = applyHomography(h, 0.9, 0.8)
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
    expect(cross).toBeCloseTo(0, 6)
  })

  it('round-trips through its inverse', () => {
    const h = homographyFromUnitSquare(quad)
    const inverse = invertHomography(h)
    for (const [x, y] of [
      [0.1, 0.9],
      [0.5, 0.5],
      [0.83, 0.17],
    ]) {
      const p = applyHomography(h, x, y)
      close(applyHomography(inverse, p.x, p.y), x, y)
    }
  })

  it('maps between two arbitrary quads', () => {
    const other: Quad = [
      { x: 5, y: 5 },
      { x: 95, y: 15 },
      { x: 85, y: 90 },
      { x: 10, y: 80 },
    ]
    const h = homographyBetween(quad, other)
    quad.forEach((p, i) => close(applyHomography(h, p.x, p.y), other[i].x, other[i].y))
  })

  it('rejects a quad whose corners are collinear', () => {
    expect(() =>
      homographyFromUnitSquare([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ]),
    ).toThrow()
  })
})
