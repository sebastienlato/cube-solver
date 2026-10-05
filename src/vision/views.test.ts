import { describe, expect, it } from 'vitest'
import { FACES, facelet, faceOf, type Face } from '../cube/facelets'
import {
  CENTER_CELLS,
  PHOTO_1_VIEW,
  PHOTO_2_VIEWS,
  QUAD_NAMES,
  cellIndex,
  cornerViewHandles,
  guideHandles,
  type CornerView,
} from './views'

/** The facelet at one corner of a quad's grid, named by the handle it touches. */
const at = (view: CornerView, quad: number, row: number, column: number) => view.cells[cellIndex(quad, row, column)]

describe('photo 1 mapping', () => {
  it('shows U on top, F on the left and R on the right', () => {
    expect(PHOTO_1_VIEW.faces).toEqual({ top: 'U', left: 'F', right: 'R' })
  })

  it('places the top quad exactly as specified: U1 at T, U3 at TR, U7 at TL, U9 at C', () => {
    // Top quad corners are T (0,0), TR (1,0), C (1,1), TL (0,1) in column, row.
    expect(at(PHOTO_1_VIEW, 0, 0, 0)).toBe(facelet('U', 1))
    expect(at(PHOTO_1_VIEW, 0, 0, 2)).toBe(facelet('U', 3))
    expect(at(PHOTO_1_VIEW, 0, 2, 0)).toBe(facelet('U', 7))
    expect(at(PHOTO_1_VIEW, 0, 2, 2)).toBe(facelet('U', 9))
  })

  it('places the left quad exactly as specified: F1 at TL, F3 at C, F7 at BL, F9 at B', () => {
    // Left quad corners are TL (0,0), C (1,0), B (1,1), BL (0,1).
    expect(at(PHOTO_1_VIEW, 1, 0, 0)).toBe(facelet('F', 1))
    expect(at(PHOTO_1_VIEW, 1, 0, 2)).toBe(facelet('F', 3))
    expect(at(PHOTO_1_VIEW, 1, 2, 0)).toBe(facelet('F', 7))
    expect(at(PHOTO_1_VIEW, 1, 2, 2)).toBe(facelet('F', 9))
  })

  it('places the right quad exactly as specified: R1 at C, R3 at TR, R7 at B, R9 at BR', () => {
    // Right quad corners are C (0,0), TR (1,0), BR (1,1), B (0,1).
    expect(at(PHOTO_1_VIEW, 2, 0, 0)).toBe(facelet('R', 1))
    expect(at(PHOTO_1_VIEW, 2, 0, 2)).toBe(facelet('R', 3))
    expect(at(PHOTO_1_VIEW, 2, 2, 0)).toBe(facelet('R', 7))
    expect(at(PHOTO_1_VIEW, 2, 2, 2)).toBe(facelet('R', 9))
  })

  it('reads each face in its own numbering, row by row', () => {
    const faces: Face[] = ['U', 'F', 'R']
    faces.forEach((face, quad) => {
      for (let k = 0; k < 9; k++) expect(PHOTO_1_VIEW.cells[quad * 9 + k]).toBe(facelet(face, k + 1))
    })
  })
})

describe('photo 2 mappings', () => {
  it('has one variant for each of D, B and L on top', () => {
    expect(PHOTO_2_VIEWS.map((view) => view.faces.top)).toEqual(['D', 'B', 'L'])
  })

  it('keeps the same handedness in every variant', () => {
    // Going top → right → left around the D-B-L corner is always the same cyclic order.
    const order = PHOTO_2_VIEWS.map((view) => `${view.faces.top}${view.faces.right}${view.faces.left}`)
    for (const cycle of order) expect('DBLDBL'.includes(cycle) || 'DLBDLB'.includes(cycle)).toBe(true)
    expect(new Set(order.map((cycle) => 'DBLDBL'.includes(cycle))).size).toBe(1)
  })

  it('covers exactly the 27 stickers that photo 1 cannot see', () => {
    const seenInPhoto1 = new Set(PHOTO_1_VIEW.cells)
    for (const view of PHOTO_2_VIEWS) {
      expect(new Set(view.cells).size).toBe(27)
      for (const index of view.cells) {
        expect(seenInPhoto1.has(index)).toBe(false)
        expect('DBL').toContain(faceOf(index))
      }
    }
  })

  it('puts each face center in the middle cell of its quad', () => {
    for (const view of [PHOTO_1_VIEW, ...PHOTO_2_VIEWS]) {
      QUAD_NAMES.forEach((quad, q) => {
        expect(view.cells[CENTER_CELLS[q]]).toBe(FACES.indexOf(view.faces[quad]) * 9 + 4)
      })
    }
  })

  it('puts the three stickers of the far corner around C', () => {
    // The D-B-L corner piece is nearest the camera, so its stickers touch C in all three quads.
    const cornerStickers = [facelet('D', 7), facelet('B', 9), facelet('L', 7)].sort((a, b) => a - b)
    for (const view of PHOTO_2_VIEWS) {
      const aroundC = [at(view, 0, 2, 2), at(view, 1, 0, 2), at(view, 2, 0, 0)].sort((a, b) => a - b)
      expect(aroundC).toEqual(cornerStickers)
    }
  })

  it('differs between variants', () => {
    const tables = new Set(PHOTO_2_VIEWS.map((view) => view.cells.join()))
    expect(tables.size).toBe(3)
  })
})

describe('corner view geometry', () => {
  it('lays the handles out as a hexagon around C', () => {
    const h = cornerViewHandles()
    expect(h.C.x).toBeCloseTo(0)
    expect(h.C.y).toBeCloseTo(0)
    expect(h.T.y).toBeLessThan(h.TL.y)
    expect(h.TL.y).toBeLessThan(h.BL.y)
    expect(h.BL.y).toBeLessThan(h.B.y)
    expect(h.TL.x).toBeLessThan(0)
    expect(h.TR.x).toBeGreaterThan(0)
    expect(h.TR.x).toBeCloseTo(-h.TL.x)
  })

  it('makes near vertices larger than far ones under perspective', () => {
    const h = cornerViewHandles(10)
    // TL, TR and B are one edge from the near corner; T, BL and BR are two edges away.
    expect(Math.hypot(h.B.x, h.B.y)).toBeGreaterThan(Math.hypot(h.T.x, h.T.y))
  })

  it('fits the guide inside the image, centered', () => {
    const h = guideHandles(1000, 800)
    expect(h.T.y).toBeCloseTo(800 * 0.11, 0)
    expect(h.B.y).toBeCloseTo(800 * 0.89, 0)
    expect((h.TL.x + h.TR.x) / 2).toBeCloseTo(500)
  })
})
