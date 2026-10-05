import { gridPaths } from '../../vision/grid'
import type { Handles } from '../../vision/views'

/**
 * The cube-corner outline and sticker grids, drawn in the coordinate system of its parent
 * <svg>. Light lines over a dark underlay stay visible on any photo.
 */
export function GridOverlay({ handles, lineWidth }: { handles: Handles; lineWidth: number }) {
  const { outline, inner } = gridPaths(handles)
  return (
    <g fill="none" strokeLinecap="round" pointerEvents="none">
      <path d={outline + inner} stroke="rgba(0,0,0,0.45)" strokeWidth={lineWidth * 2.6} />
      <path d={inner} stroke="rgba(255,255,255,0.8)" strokeWidth={lineWidth} />
      <path d={outline} stroke="#fff" strokeWidth={lineWidth * 1.6} />
    </g>
  )
}
