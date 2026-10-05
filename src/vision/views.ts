/**
 * How a photo of a cube corner maps onto facelets.
 *
 * A corner photo shows a hexagon with seven key points: the near corner C in the middle and
 * T, TR, BR, B, BL, TL around it. The three visible faces are the quads top (T, TR, C, TL),
 * left (TL, C, B, BL) and right (C, TR, BR, B), each divided into a 3×3 grid of cells.
 *
 * Nothing here is a hand-written lookup table. Each view is a rigid rotation of the 3D cube
 * in front of one fixed camera; projecting every visible sticker and seeing which cell it
 * lands in produces the cell → facelet table.
 */
import type { Face } from '../cube/facelets'
import {
  CUBE_ROTATIONS,
  FACELET_GEOMETRY,
  applyMat3,
  dot,
  faceWithNormal,
  type Mat3,
  type Vec3,
} from '../cube/geometry'
import { applyHomography, homographyFromUnitSquare, invertHomography, type Point, type Quad } from './homography'

export const HANDLE_NAMES = ['C', 'T', 'TR', 'BR', 'B', 'BL', 'TL'] as const
export type HandleName = (typeof HANDLE_NAMES)[number]
export type Handles = Record<HandleName, Point>

export const QUAD_NAMES = ['top', 'left', 'right'] as const
export type QuadName = (typeof QUAD_NAMES)[number]

/** Corners of each face quad, in the order that the unit square's (0,0), (1,0), (1,1), (0,1) map to. */
export const QUAD_CORNERS: Record<QuadName, readonly [HandleName, HandleName, HandleName, HandleName]> = {
  top: ['T', 'TR', 'C', 'TL'],
  left: ['TL', 'C', 'B', 'BL'],
  right: ['C', 'TR', 'BR', 'B'],
}

export const quadOf = (handles: Handles, quad: QuadName): Quad =>
  QUAD_CORNERS[quad].map((name) => handles[name]) as unknown as Quad

export const CELLS_PER_PHOTO = 27
/** Cell index within a photo: quad (top, left, right) × row × column. */
export const cellIndex = (quad: number, row: number, column: number): number => quad * 9 + row * 3 + column
/** The three center cells of a photo, one per quad. */
export const CENTER_CELLS = [cellIndex(0, 1, 1), cellIndex(1, 1, 1), cellIndex(2, 1, 1)] as const

/** The cube vertex behind each handle, in the camera's frame. The cube spans ±1.5 cubies. */
export const HANDLE_VERTEX: Record<HandleName, Vec3> = {
  C: [1.5, 1.5, 1.5],
  T: [-1.5, 1.5, -1.5],
  TR: [1.5, 1.5, -1.5],
  BR: [1.5, -1.5, -1.5],
  B: [1.5, -1.5, 1.5],
  BL: [-1.5, -1.5, 1.5],
  TL: [-1.5, 1.5, 1.5],
}

// The camera looks down the (1,1,1) diagonal at the near corner, with +y up on screen.
const TOWARD_CAMERA: Vec3 = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)]
const SCREEN_RIGHT: Vec3 = [1 / Math.sqrt(2), 0, -1 / Math.sqrt(2)]
const SCREEN_UP: Vec3 = [-1 / Math.sqrt(6), 2 / Math.sqrt(6), -1 / Math.sqrt(6)]

export const CORNER_CAMERA = { toward: TOWARD_CAMERA, right: SCREEN_RIGHT, up: SCREEN_UP }

/**
 * Projects a point in the camera frame onto the image plane, in cubie units with x to the
 * right and y down. `distance` is from the camera to the cube's center; Infinity gives an
 * orthographic view.
 */
export function projectCornerView(point: Vec3, distance = Infinity): Point {
  const scale = Number.isFinite(distance) ? distance / (distance - dot(point, TOWARD_CAMERA)) : 1
  return { x: dot(point, SCREEN_RIGHT) * scale, y: -dot(point, SCREEN_UP) * scale }
}

/** Camera distance of a typical hand-held phone photo, in cubies (about 27 cm for a 57 mm cube). */
export const TYPICAL_CAMERA_DISTANCE = 14

/** The seven key points of a corner view, in cubie units centered on C. */
export function cornerViewHandles(distance = Infinity): Handles {
  return Object.fromEntries(
    HANDLE_NAMES.map((name) => [name, projectCornerView(HANDLE_VERTEX[name], distance)]),
  ) as Handles
}

/**
 * Where to draw the guide (and place the handles by default) in an area of the given size:
 * the corner view of a typical photo, centered, as large as fits in `fill` of the area.
 */
export function guideHandles(width: number, height: number, fill = 0.78): Handles {
  const unit = cornerViewHandles(TYPICAL_CAMERA_DISTANCE)
  const scale = Math.min((width * fill) / (unit.TR.x - unit.TL.x), (height * fill) / (unit.B.y - unit.T.y))
  // C is not midway between T and B under perspective, so center the outline, not C.
  const centerY = (unit.B.y + unit.T.y) / 2
  return Object.fromEntries(
    HANDLE_NAMES.map((name) => [
      name,
      { x: width / 2 + unit[name].x * scale, y: height / 2 + (unit[name].y - centerY) * scale },
    ]),
  ) as Handles
}

export interface CornerView {
  /** Rotation that turns the cube from its standard orientation into this pose in front of the camera. */
  rotation: Mat3
  /** The face shown in each quad. */
  faces: Record<QuadName, Face>
  /** For each of the 27 cells, the facelet seen there. */
  cells: number[]
}

/** Which quad a sticker appears in, from its outward normal in the camera frame. */
const quadFacing = (normal: Vec3): number | null =>
  normal[1] === 1 ? 0 : normal[2] === 1 ? 1 : normal[0] === 1 ? 2 : null

function buildView(rotation: Mat3): CornerView {
  const corners = cornerViewHandles()
  const toUnitSquare = QUAD_NAMES.map((quad) => invertHomography(homographyFromUnitSquare(quadOf(corners, quad))))
  const cells = new Array<number>(CELLS_PER_PHOTO).fill(-1)
  for (const sticker of FACELET_GEOMETRY) {
    const normal = applyMat3(rotation, sticker.normal)
    const quad = quadFacing(normal)
    if (quad === null) continue
    const cubie = applyMat3(rotation, sticker.position)
    // The sticker sits on the face plane, half a cubie out from its cubie's center.
    const center: Vec3 = [cubie[0] + normal[0] / 2, cubie[1] + normal[1] / 2, cubie[2] + normal[2] / 2]
    const onScreen = projectCornerView(center)
    const { x: u, y: v } = applyHomography(toUnitSquare[quad], onScreen.x, onScreen.y)
    cells[cellIndex(quad, Math.floor(v * 3), Math.floor(u * 3))] = sticker.index
  }
  const inverse = transpose(rotation)
  return {
    rotation,
    cells,
    faces: {
      top: faceWithNormal(applyMat3(inverse, [0, 1, 0])),
      left: faceWithNormal(applyMat3(inverse, [0, 0, 1])),
      right: faceWithNormal(applyMat3(inverse, [1, 0, 0])),
    },
  }
}

const transpose = (m: Mat3): Mat3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

/** Photo 1: the U-F-R corner with U on top, F on the left and R on the right. */
export const PHOTO_1_VIEW: CornerView = buildView(IDENTITY)

/**
 * Photo 2: the opposite corner, D-B-L. Three rotations bring it to face the camera, one for
 * each of D, B and L on top. They are rotations only, never mirror images, so left and right
 * follow from which face is on top. D on top comes first: it is what turning the cube upside
 * down gives.
 */
export const PHOTO_2_VIEWS: CornerView[] = CUBE_ROTATIONS.filter((rotation) => {
  const corner = applyMat3(rotation, [-1, -1, -1])
  return corner[0] === 1 && corner[1] === 1 && corner[2] === 1
})
  .map(buildView)
  .sort((a, b) => 'DBL'.indexOf(a.faces.top) - 'DBL'.indexOf(b.faces.top))
