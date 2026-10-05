/** Whole-cube orientations for the how-to-hold illustrations, as quaternions [x, y, z, w]. */
import type { Mat3 } from '../cube/geometry'
import type { Pose } from '../three/Cube3D'
import { PHOTO_2_VIEWS } from '../vision/views'

const axisAngle = (axis: readonly [number, number, number], radians: number): Pose => {
  const s = Math.sin(radians / 2)
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(radians / 2)]
}

const multiply = (a: Pose, b: Pose): Pose => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]

/** Converts a rotation matrix to a quaternion. */
export function poseFromMatrix(m: Mat3): Pose {
  const trace = m[0] + m[4] + m[8]
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2
    return [(m[7] - m[5]) / s, (m[2] - m[6]) / s, (m[3] - m[1]) / s, s / 4]
  }
  if (m[0] > m[4] && m[0] > m[8]) {
    const s = Math.sqrt(1 + m[0] - m[4] - m[8]) * 2
    return [s / 4, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s]
  }
  if (m[4] > m[8]) {
    const s = Math.sqrt(1 + m[4] - m[0] - m[8]) * 2
    return [(m[1] + m[3]) / s, s / 4, (m[5] + m[7]) / s, (m[2] - m[6]) / s]
  }
  const s = Math.sqrt(1 + m[8] - m[0] - m[4]) * 2
  return [(m[2] + m[6]) / s, (m[5] + m[7]) / s, s / 4, (m[3] - m[1]) / s]
}

/** The cube as photo 1 sees it: the corner view is the camera's own, so no rotation. */
export const CORNER_POSE: Pose = [0, 0, 0, 1]

/**
 * The cube with its front face square to the corner camera: turned 45° about the vertical,
 * then tipped up. Photo 1's illustration starts here and turns to the corner.
 */
export const FACE_ON_POSE: Pose = multiply(
  axisAngle([Math.SQRT1_2, 0, -Math.SQRT1_2], -Math.atan(Math.SQRT1_2)),
  axisAngle([0, 1, 0], Math.PI / 4),
)

/** The cube turned upside down to show the opposite corner, as in photo 2. */
export const OPPOSITE_CORNER_POSE: Pose = poseFromMatrix(PHOTO_2_VIEWS[0].rotation)
