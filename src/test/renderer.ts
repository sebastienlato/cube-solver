/**
 * Synthetic corner photos for the vision tests and the upload e2e test.
 *
 * This is a small ray caster, deliberately independent of the pipeline's own mapping code:
 * for every pixel it finds the point on the cube that the pixel sees, turns that back into a
 * cubie position, and looks the sticker up in the cube geometry. If the pipeline's
 * cell → facelet tables were wrong, images drawn here would not round-trip.
 */
import { FACES, type Face } from '../cube/facelets'
import { applyMat3, faceletAt, type Mat3, type Vec3 } from '../cube/geometry'
import { mulberry32, type Rng } from '../cube/state'
import { linearToSrgb, srgbToLinear, type RGB } from '../vision/color'
import type { Raster } from '../vision/sample'
import { CORNER_CAMERA, HANDLE_NAMES, HANDLE_VERTEX, projectCornerView, type Handles } from '../vision/views'

/** Sticker colors of an ordinary cube as a phone camera sees them, sRGB 0–255, by face in the solved state. */
export const PHOTO_COLORS: Record<Face, RGB> = {
  U: [232, 232, 226],
  R: [188, 32, 38],
  F: [34, 150, 74],
  D: [226, 204, 44],
  L: [238, 112, 30],
  B: [30, 82, 178],
}

export interface Lighting {
  /** Per-channel gain: the tint the light and the camera's white balance leave on the photo. */
  cast: RGB
  /** Brightness of the top, left and right faces. Real faces catch the light differently. */
  shading: [number, number, number]
  /** A soft sheen. Position and radius are in pixels, strength in linear light at its center. */
  glare: { x: number; y: number; radius: number; strength: number } | null
  /** Small blown-out highlights with crisp edges, as a glossy sticker reflects a lamp. */
  sparkles: { x: number; y: number; radius: number }[]
  /** Standard deviation of sensor noise, in sRGB levels. */
  noise: number
  /** Overall exposure, as a multiplier on linear light. */
  exposure: number
  background: RGB
}

export interface RenderOptions {
  width: number
  height: number
  /** Prints a round logo of this color in the middle of one face's center sticker, as many cubes have. */
  logo?: { face: Face; color: RGB }
  /** Pose of the cube in front of the camera (a `CornerView.rotation`). */
  rotation: Mat3
  /** Camera distance in cubies. */
  distance: number
  /** Height of the cube's outline as a share of the smaller image dimension. */
  fill: number
  lighting: Lighting
  colors?: Record<Face, RGB>
  seed?: number
}

export const NEUTRAL_LIGHTING: Lighting = {
  cast: [1, 1, 1],
  shading: [1, 0.85, 0.7],
  glare: null,
  sparkles: [],
  noise: 0,
  exposure: 1,
  background: [120, 118, 112],
}

/** Random but plausible indoor lighting: a mild tint, uneven faces, one glare spot, some noise. */
export function randomLighting(rng: Rng, width: number, height: number): Lighting {
  const between = (low: number, high: number) => low + rng() * (high - low)
  const levels = [between(0.9, 1), between(0.68, 0.9), between(0.5, 0.75)]
  // Any face may be the brightest; shuffle which gets which level.
  const shading = [0, 1, 2].map(() => levels.splice(Math.floor(rng() * levels.length), 1)[0]) as [
    number,
    number,
    number,
  ]
  return {
    cast: [between(0.9, 1.1), between(0.95, 1.05), between(0.88, 1.12)],
    shading,
    // A soft sheen a few stickers wide, as from a lamp or window; not a blown-out hot spot.
    glare: {
      x: between(0.3, 0.7) * width,
      y: between(0.3, 0.7) * height,
      radius: between(0.08, 0.16) * Math.min(width, height),
      strength: between(0.05, 0.18),
    },
    sparkles: Array.from({ length: 3 }, () => ({
      x: between(0.25, 0.75) * width,
      y: between(0.2, 0.8) * height,
      radius: between(0.007, 0.013) * Math.min(width, height),
    })),
    noise: between(1.5, 3.5),
    exposure: between(0.75, 1.1),
    background: [between(40, 200), between(40, 200), between(40, 200)],
  }
}

const BORDER = 0.07
const PLASTIC = 0.012
/** Radius of a center logo, as a share of a sticker's width. */
const LOGO_RADIUS = 0.2

/** Where the seven key points fall in the rendered image. */
export function renderedHandles({
  width,
  height,
  distance,
  fill,
}: Pick<RenderOptions, 'width' | 'height' | 'distance' | 'fill'>): {
  handles: Handles
  scale: number
  centerX: number
  centerY: number
} {
  const unit = Object.fromEntries(
    HANDLE_NAMES.map((name) => [name, projectCornerView(HANDLE_VERTEX[name], distance)]),
  ) as Handles
  const scale = (Math.min(width, height) * fill) / (unit.B.y - unit.T.y)
  const centerX = width / 2
  const centerY = height / 2 - ((unit.B.y + unit.T.y) / 2) * scale
  const handles = Object.fromEntries(
    HANDLE_NAMES.map((name) => [name, { x: centerX + unit[name].x * scale, y: centerY + unit[name].y * scale }]),
  ) as Handles
  return { handles, scale, centerX, centerY }
}

export function renderCornerPhoto(state: string, options: RenderOptions): { image: Raster; handles: Handles } {
  const { width, height, rotation, distance, lighting } = options
  const colors = options.colors ?? PHOTO_COLORS
  const rng = mulberry32(options.seed ?? 1)
  const { handles, scale, centerX, centerY } = renderedHandles(options)

  const linearColor = Object.fromEntries(
    FACES.map((face) => [face, colors[face].map(srgbToLinear) as unknown as RGB]),
  ) as Record<Face, RGB>
  const background = lighting.background.map(srgbToLinear)
  const logoColor = options.logo?.color.map(srgbToLinear)
  const logoSticker = options.logo ? FACES.indexOf(options.logo.face) * 9 + 4 : -1

  // The cube is rotated in front of a fixed camera; map hits back into cube space with the inverse.
  const inverse: Mat3 = [
    rotation[0],
    rotation[3],
    rotation[6],
    rotation[1],
    rotation[4],
    rotation[7],
    rotation[2],
    rotation[5],
    rotation[8],
  ]
  const { toward, right, up } = CORNER_CAMERA
  const eye: Vec3 = [toward[0] * distance, toward[1] * distance, toward[2] * distance]

  // Each visible face in the camera frame: the axis it is perpendicular to, the two axes that
  // span it, which quad's shading it takes, and the sticker at each of its nine cells.
  const faces = [
    { axis: 1, a: 0, b: 2, shade: lighting.shading[0] },
    { axis: 2, a: 0, b: 1, shade: lighting.shading[1] },
    { axis: 0, a: 1, b: 2, shade: lighting.shading[2] },
  ].map((face) => {
    const stickers: number[] = []
    for (let ca = 0; ca < 3; ca++) {
      for (let cb = 0; cb < 3; cb++) {
        const cubie = [0, 0, 0]
        const normal = [0, 0, 0]
        cubie[face.axis] = 1
        normal[face.axis] = 1
        cubie[face.a] = ca - 1
        cubie[face.b] = cb - 1
        stickers.push(
          faceletAt(applyMat3(inverse, cubie as unknown as Vec3), applyMat3(inverse, normal as unknown as Vec3)),
        )
      }
    }
    return { ...face, stickers }
  })

  const data = new Uint8ClampedArray(width * height * 4)
  const direction = [0, 0, 0]
  const plastic = [PLASTIC, PLASTIC, PLASTIC]

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      // The ray from the eye through this pixel's point on the plane that faces the camera at the cube's center.
      const sx = (px - centerX) / scale
      const sy = -(py - centerY) / scale
      for (let i = 0; i < 3; i++) direction[i] = right[i] * sx + up[i] * sy - eye[i]

      let color: readonly number[] = background
      let shade = 1
      let nearest = Infinity
      for (const face of faces) {
        const along = direction[face.axis]
        if (along >= 0) continue
        const t = (1.5 - eye[face.axis]) / along
        if (t <= 0 || t >= nearest) continue
        const ha = eye[face.a] + direction[face.a] * t + 1.5
        const hb = eye[face.b] + direction[face.b] * t + 1.5
        if (ha < 0 || ha > 3 || hb < 0 || hb > 3) continue
        nearest = t
        shade = face.shade
        const ca = Math.min(2, Math.floor(ha))
        const cb = Math.min(2, Math.floor(hb))
        const wa = ha - ca
        const wb = hb - cb
        const onBorder = wa < BORDER || wa > 1 - BORDER || wb < BORDER || wb > 1 - BORDER
        const sticker = face.stickers[ca * 3 + cb]
        const onLogo = sticker === logoSticker && Math.hypot(wa - 0.5, wb - 0.5) < LOGO_RADIUS
        color = onBorder ? plastic : onLogo && logoColor ? logoColor : linearColor[state[sticker] as Face]
      }

      let glare = 0
      if (lighting.glare && nearest < Infinity) {
        const dx = px - lighting.glare.x
        const dy = py - lighting.glare.y
        glare = lighting.glare.strength * Math.exp(-(dx * dx + dy * dy) / (2 * lighting.glare.radius ** 2))
      }
      if (nearest < Infinity) {
        for (const sparkle of lighting.sparkles) {
          if (Math.hypot(px - sparkle.x, py - sparkle.y) < sparkle.radius) glare = 1
        }
      }

      const offset = (py * width + px) * 4
      for (let c = 0; c < 3; c++) {
        const lit = (color[c] * shade + glare) * lighting.cast[c] * lighting.exposure
        // Two uniform draws make a cheap, bell-shaped noise term.
        const noise = lighting.noise > 0 ? (rng() + rng() - 1) * lighting.noise * 2.45 : 0
        data[offset + c] = linearToSrgb(lit) + noise
      }
      data[offset + 3] = 255
    }
  }

  return { image: { data, width, height }, handles }
}
