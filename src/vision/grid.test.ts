import { describe, expect, it } from 'vitest'
import { gridPaths } from './grid'
import { guideHandles } from './views'

describe('gridPaths', () => {
  it('draws four edges and four inner lines for each of the three faces', () => {
    const { outline, inner } = gridPaths(guideHandles(600, 600))
    expect(outline.match(/M/g)).toHaveLength(12)
    expect(inner.match(/M/g)).toHaveLength(12)
  })

  it('starts the top face outline at the T handle', () => {
    const handles = guideHandles(600, 600)
    expect(gridPaths(handles).outline.startsWith(`M${handles.T.x.toFixed(1)} ${handles.T.y.toFixed(1)}`)).toBe(true)
  })

  it('skips a face whose corners are collinear instead of failing', () => {
    const handles = guideHandles(600, 600)
    const flat = { ...handles, T: { x: 0, y: 0 }, TR: { x: 1, y: 1 }, C: { x: 2, y: 2 }, TL: { x: 3, y: 3 } }
    expect(() => gridPaths(flat)).not.toThrow()
    expect(gridPaths(flat).outline.match(/M/g)?.length ?? 0).toBeLessThan(12)
  })
})
