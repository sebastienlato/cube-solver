/**
 * The 3D cube. One component serves the Home hero, the how-to-hold illustrations, Review and
 * Solution. The facelet string is the only source of truth: a move is animated by rotating
 * the nine cubies of a layer about its axis, then "baked" by resetting those cubies and
 * repainting every sticker from the next facelet string. Nothing accumulates between moves.
 */
import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  CanvasTexture,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
  type BufferGeometry,
  type Mesh,
  type PerspectiveCamera,
} from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { FACES, type Face } from '../cube/facelets'
import { FACELET_GEOMETRY, FACE_NORMAL, dot, type Vec3 } from '../cube/geometry'
import { parseMove, type Move } from '../cube/moves'
import { applyMove } from '../cube/state'
import type { ColorScheme } from '../cube/scheme'
import type { Turn } from './Playback'

export type CubeView = 'solve' | 'hero' | 'corner'
export type Pose = readonly [x: number, y: number, z: number, w: number]

export interface Cube3DProps {
  facelets: string
  colors: ColorScheme
  /** Text alternative for the canvas. */
  label: string
  view?: CubeView
  /** A move to animate from `facelets`. A new `id` starts a new animation; null cancels. */
  turn?: Turn | null
  /** Milliseconds for the current turn. Zero completes it at once. */
  turnDuration?: number
  onTurnEnd?: (id: number) => void
  /** Drag to orbit. 'horizontal' spins about the vertical axis only, so the page can still scroll. */
  orbit?: boolean | 'horizontal'
  idleSpin?: boolean
  /** Play the settle-in when the cube first appears. */
  settleIn?: boolean
  /** Orientation of the whole cube, animated when it changes. */
  pose?: Pose
  /** Orientation to start from, so the first appearance shows the motion into `pose`. */
  poseFrom?: Pose
  /** Change this number to replay the motion from `poseFrom` to `pose`. */
  poseReplayKey?: number
  /** Change this number to play the solved celebration once. */
  celebrateKey?: number
  /** Change this number to put the camera back where it started. */
  resetViewKey?: number
  shadow?: boolean
  reducedMotion?: boolean
  className?: string
}

const VIEW_DIRECTION: Record<CubeView, Vec3> = {
  // U on top, F facing the viewer, R just visible: the position the solution is written for.
  solve: [0.5, 0.52, 1],
  hero: [0.92, 0.66, 1],
  // Straight at the U-F-R corner, as in photo 1.
  corner: [1, 1, 1],
}

const FOV = 30
/** Radius the camera frames: the cube's bounding sphere plus room for its shadow. */
const FRAME_RADIUS = 2.72
const BODY_COLOR = '#0e0f12'
const SHADOW_LIFT = 0.24
const IDENTITY: Pose = [0, 0, 0, 1]

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t: number) => 1 - (1 - t) ** 3

function roundedSquare(size: number, radius: number): BufferGeometry {
  const h = size / 2
  const shape = new Shape()
  shape.moveTo(-h + radius, -h)
  shape.lineTo(h - radius, -h)
  shape.absarc(h - radius, -h + radius, radius, -Math.PI / 2, 0, false)
  shape.lineTo(h, h - radius)
  shape.absarc(h - radius, h - radius, radius, 0, Math.PI / 2, false)
  shape.lineTo(-h + radius, h)
  shape.absarc(-h + radius, h - radius, radius, Math.PI / 2, Math.PI, false)
  shape.lineTo(-h, -h + radius)
  shape.absarc(-h + radius, -h + radius, radius, Math.PI, Math.PI * 1.5, false)
  return new ShapeGeometry(shape, 6)
}

/** Geometry is identical for every cube on the page, so it is built once and never disposed. */
let sharedGeometry: {
  body: BufferGeometry
  sticker: BufferGeometry
  floor: BufferGeometry
  slab: BufferGeometry
} | null = null
const geometry = () =>
  (sharedGeometry ??= {
    body: new RoundedBoxGeometry(0.985, 0.985, 0.985, 3, 0.085),
    sticker: roundedSquare(0.84, 0.11),
    floor: new PlaneGeometry(5.4, 5.4),
    slab: new RoundedBoxGeometry(3.12, 1.06, 3.12, 2, 0.08),
  })

function contactShadowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 6, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(0,0,0,0.36)')
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)')
  gradient.addColorStop(0.8, 'rgba(0,0,0,0.05)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  return new CanvasTexture(canvas)
}

interface Cubie {
  home: Vec3
  stickers: { index: number; normal: Vec3 }[]
}

const CUBIES: Cubie[] = (() => {
  const cubies: Cubie[] = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        if (x === 0 && y === 0 && z === 0) continue
        const stickers = FACELET_GEOMETRY.filter(
          (g) => g.position[0] === x && g.position[1] === y && g.position[2] === z,
        ).map((g) => ({ index: g.index, normal: g.normal }))
        cubies.push({ home: [x, y, z], stickers })
      }
    }
  }
  return cubies
})()

const Z_AXIS = new Vector3(0, 0, 1)
const stickerQuaternion = (normal: Vec3) => new Quaternion().setFromUnitVectors(Z_AXIS, new Vector3(...normal))

/** Signed angle of a layer turn at progress t. Clockwise is negative about the face's outward normal. */
function turnAngle(move: Move, t: number): number {
  const { turns } = parseMove(move)
  const quarter = Math.PI / 2
  return (turns === 3 ? quarter : -quarter * turns) * t
}

interface Animation {
  id: number
  move: Move
  base: string
  duration: number
  /** Set on the first rendered frame, so a slow first frame doesn't eat the animation. */
  start: number | null
}

interface Timed {
  start: number | null
  duration: number
}

interface SceneProps extends Omit<Cube3DProps, 'label' | 'className'> {
  onDisplay: (facelets: string) => void
  /** Called once the shaders are ready, which is when drawing can start without a stall. */
  onCompiled: () => void
}

function CubeScene({
  facelets,
  colors,
  view = 'solve',
  turn = null,
  turnDuration = 400,
  onTurnEnd,
  orbit = false,
  idleSpin = false,
  settleIn = false,
  pose = IDENTITY,
  poseFrom,
  poseReplayKey = 0,
  celebrateKey = 0,
  resetViewKey = 0,
  shadow = true,
  reducedMotion = false,
  onDisplay,
  onCompiled,
}: SceneProps) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)

  // Compiling shaders on first draw can freeze the page for a moment on a phone. Asking for
  // them ahead of time lets the browser compile in the background; drawing waits until then.
  useEffect(() => {
    let cancelled = false
    const ready = () => {
      if (!cancelled) onCompiled()
    }
    // Without the parallel-compile extension there is nothing to wait for: three.js would
    // compile on the spot (and warn), exactly as the first draw does anyway.
    if (gl.extensions.has('KHR_parallel_shader_compile')) gl.compileAsync(scene, camera).then(ready, ready)
    else ready()
    return () => {
      cancelled = true
    }
    // Once per canvas: the scene's materials never change after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl])

  const controls = useRef<OrbitControlsImpl>(null)
  const lights = useRef<Group>(null)
  const poseGroup = useRef<Group>(null)
  const effects = useRef<Group>(null)
  const highlight = useRef<Mesh>(null)
  const cubieGroups = useRef<(Group | null)[]>([])
  const stickerMeshes = useRef<(Mesh | null)[]>([])

  const materials = useMemo(() => {
    const body = new MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.42, metalness: 0.05 })
    const stickers = Object.fromEntries(
      FACES.map((face) => [
        face,
        // Offset so stickers never z-fight with the body face they sit on.
        new MeshStandardMaterial({ roughness: 0.36, polygonOffset: true, polygonOffsetFactor: -2 }),
      ]),
    ) as Record<Face, MeshStandardMaterial>
    const floor = new MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false })
    const glow = new MeshBasicMaterial({ color: '#8f6cf0', transparent: true, opacity: 0.38, depthWrite: false })
    return { body, stickers, floor, glow }
  }, [])

  useEffect(
    () => () => {
      materials.body.dispose()
      materials.floor.map?.dispose()
      materials.floor.dispose()
      materials.glow.dispose()
      for (const face of FACES) materials.stickers[face].dispose()
    },
    [materials],
  )

  useLayoutEffect(() => {
    for (const face of FACES) materials.stickers[face].color.set(colors[face])
    invalidate()
  }, [colors, materials, invalidate])

  // ---- Stickers and layer turns -------------------------------------------------------------

  const animation = useRef<Animation | null>(null)
  const callbacks = useRef({ onTurnEnd, onDisplay })
  useLayoutEffect(() => {
    callbacks.current = { onTurnEnd, onDisplay }
  })

  const scratch = useMemo(() => ({ axis: new Vector3(), quaternion: new Quaternion(), target: new Quaternion() }), [])

  const paint = (state: string) => {
    stickerMeshes.current.forEach((mesh, index) => {
      if (mesh) mesh.material = materials.stickers[state[index] as Face]
    })
    callbacks.current.onDisplay(state)
  }

  const restLayers = () => {
    CUBIES.forEach((cubie, i) => {
      const group = cubieGroups.current[i]
      if (!group) return
      group.position.set(...cubie.home)
      group.quaternion.identity()
    })
  }

  const rotateLayer = (move: Move, t: number) => {
    const normal = FACE_NORMAL[parseMove(move).face]
    scratch.axis.set(...normal)
    scratch.quaternion.setFromAxisAngle(scratch.axis, turnAngle(move, t))
    CUBIES.forEach((cubie, i) => {
      const group = cubieGroups.current[i]
      if (!group || dot(cubie.home, normal) !== 1) return
      group.position.set(...cubie.home).applyQuaternion(scratch.quaternion)
      group.quaternion.copy(scratch.quaternion)
    })
  }

  const flashLayer = (move: Move) => {
    const mesh = highlight.current
    if (!mesh) return
    const normal = FACE_NORMAL[parseMove(move).face]
    mesh.position.set(...normal)
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...normal))
    mesh.visible = true
    flash.current = { start: null, duration: 420 }
  }

  const turnId = turn?.id ?? null
  useLayoutEffect(() => {
    restLayers()
    paint(facelets)
    animation.current = turn
      ? { id: turn.id, move: turn.move, base: facelets, duration: turnDuration, start: null }
      : null
    invalidate()
    // `turn` is identified by its id; its duration is read once, when the turn starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facelets, turnId])

  // ---- Whole-cube motion: pose changes, the settle-in and the celebration -------------------

  const flash = useRef<Timed | null>(null)
  const settle = useRef<Timed | null>(settleIn && !reducedMotion ? { start: null, duration: 1500 } : null)
  const celebration = useRef<Timed | null>(null)
  const poseMotion = useRef<(Timed & { from: Quaternion; to: Quaternion }) | null>(null)
  const firstPose = useRef(true)

  useLayoutEffect(() => {
    const group = poseGroup.current
    if (!group) return
    const to = new Quaternion(...pose)
    const from =
      firstPose.current || poseReplayKey > 0
        ? poseFrom
          ? new Quaternion(...poseFrom)
          : null
        : group.quaternion.clone()
    firstPose.current = false
    if (reducedMotion || !from || from.angleTo(to) < 1e-3) {
      group.quaternion.copy(to)
      poseMotion.current = null
    } else {
      group.quaternion.copy(from)
      poseMotion.current = { start: null, duration: 1300, from, to }
    }
    invalidate()
    // The pose is compared by value, component by component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose[0], pose[1], pose[2], pose[3], poseReplayKey, reducedMotion])

  const celebrated = useRef(celebrateKey)
  useEffect(() => {
    if (celebrateKey === celebrated.current) return
    celebrated.current = celebrateKey
    if (!reducedMotion) celebration.current = { start: null, duration: 1250 }
    invalidate()
  }, [celebrateKey, reducedMotion, invalidate])

  // ---- Camera -------------------------------------------------------------------------------

  const direction = useMemo(() => new Vector3(...VIEW_DIRECTION[view]).normalize(), [view])
  const distance = useMemo(() => {
    const vertical = (FOV * Math.PI) / 180
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * (size.width / Math.max(1, size.height)))
    return FRAME_RADIUS / Math.sin(Math.min(vertical, horizontal) / 2)
  }, [size.width, size.height])

  useLayoutEffect(() => {
    // Keep whatever angle the user has orbited to; only the distance follows the canvas shape.
    if (camera.position.lengthSq() < 1e-6) camera.position.copy(direction)
    camera.position.setLength(distance)
    camera.lookAt(0, 0, 0)
    controls.current?.update()
    invalidate()
  }, [camera, direction, distance, invalidate])

  useLayoutEffect(() => {
    camera.up.set(0, 1, 0)
    camera.position.copy(direction).setLength(distance)
    camera.lookAt(0, 0, 0)
    controls.current?.target.set(0, 0, 0)
    controls.current?.update()
    invalidate()
    // Runs when the view preset or the reset key changes, not on every resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetViewKey, direction])

  const polar = useMemo(() => Math.acos(direction.y), [direction])

  // ---- Frame loop ---------------------------------------------------------------------------

  /** Progress of a timed motion, or null once it has finished. */
  const progress = (motion: Timed, now: number): number => {
    motion.start ??= now
    return Math.min(1, (now - motion.start) / motion.duration)
  }

  useFrame(() => {
    const now = performance.now()
    let busy = false

    // Lights ride with the camera so the faces in view are always evenly lit.
    lights.current?.quaternion.copy(camera.quaternion)

    const current = animation.current
    if (current) {
      current.start ??= now
      const t = current.duration <= 0 ? 1 : Math.min(1, (now - current.start) / current.duration)
      if (t >= 1) {
        animation.current = null
        restLayers()
        paint(applyMove(current.base, current.move))
        if (current.duration <= 0) flashLayer(current.move)
        callbacks.current.onTurnEnd?.(current.id)
      } else {
        rotateLayer(current.move, easeInOut(t))
      }
      busy = true
    }

    if (flash.current) {
      if (progress(flash.current, now) >= 1) {
        flash.current = null
        if (highlight.current) highlight.current.visible = false
      }
      busy = true
    }

    const posing = poseMotion.current
    if (posing && poseGroup.current) {
      const t = progress(posing, now)
      poseGroup.current.quaternion.copy(posing.from).slerp(posing.to, easeInOut(t))
      if (t >= 1) poseMotion.current = null
      busy = true
    }

    const group = effects.current
    if (group) {
      let spin = 0
      let tilt = 0
      let scale = 1
      let lift = 0
      if (settle.current) {
        const t = progress(settle.current, now)
        const rest = 1 - easeOut(t)
        spin -= 1.5 * rest
        tilt += 0.4 * rest
        scale = 1 - 0.12 * rest
        if (t >= 1) settle.current = null
        busy = true
      }
      if (celebration.current) {
        const t = progress(celebration.current, now)
        spin += Math.PI * 2 * easeInOut(t)
        lift = 0.28 * Math.sin(Math.PI * t)
        if (t >= 1) celebration.current = null
        busy = true
      }
      group.rotation.set(tilt, spin, 0)
      group.scale.setScalar(scale)
      group.position.y = lift
    }

    if (busy) invalidate()
  })

  return (
    <>
      <ambientLight intensity={1.95} />
      <group ref={lights}>
        <directionalLight position={[-2.5, 6, 4]} intensity={1.8} />
        <directionalLight position={[5, -1, 3]} intensity={0.85} />
      </group>

      {/* With a shadow, the cube sits a little high in the frame so the shadow has room below it. */}
      <group position={[0, shadow ? SHADOW_LIFT : 0, 0]}>
        <group ref={poseGroup}>
          <group ref={effects}>
            {CUBIES.map((cubie, i) => (
              <group
                key={cubie.home.join()}
                position={cubie.home as [number, number, number]}
                ref={(group) => {
                  cubieGroups.current[i] = group
                }}
              >
                <mesh geometry={geometry().body} material={materials.body} />
                {cubie.stickers.map((sticker) => (
                  <mesh
                    key={sticker.index}
                    geometry={geometry().sticker}
                    position={[sticker.normal[0] * 0.4935, sticker.normal[1] * 0.4935, sticker.normal[2] * 0.4935]}
                    quaternion={stickerQuaternion(sticker.normal)}
                    ref={(mesh) => {
                      stickerMeshes.current[sticker.index] = mesh
                    }}
                  />
                ))}
              </group>
            ))}
            <mesh ref={highlight} geometry={geometry().slab} material={materials.glow} visible={false} />
          </group>
        </group>

        {shadow && (
          <mesh
            geometry={geometry().floor}
            material={materials.floor}
            position={[0, -1.56, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        )}
      </group>

      {orbit && (
        <OrbitControls
          ref={controls}
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.12}
          rotateSpeed={0.85}
          autoRotate={idleSpin && !reducedMotion}
          autoRotateSpeed={0.9}
          minPolarAngle={orbit === 'horizontal' ? polar : 0}
          maxPolarAngle={orbit === 'horizontal' ? polar : Math.PI}
        />
      )}
    </>
  )
}

export default function Cube3D({ label, className, ...scene }: Cube3DProps) {
  const wrapper = useRef<HTMLDivElement>(null)
  const [compiled, setCompiled] = useState(false)
  const spinning = scene.idleSpin && !scene.reducedMotion

  return (
    // An empty label means the cube is decoration inside something that already has a name.
    <div
      ref={wrapper}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={className}
    >
      <Canvas
        flat
        dpr={[1, 2]}
        frameloop={!compiled ? 'never' : spinning ? 'always' : 'demand'}
        camera={{ fov: FOV, near: 0.5, far: 60, position: [0, 0, 0] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <CubeScene
          {...scene}
          onCompiled={() => setCompiled(true)}
          onDisplay={(facelets) => {
            // Exposes what is actually painted, after baking, for tests and debugging.
            if (wrapper.current) wrapper.current.dataset.facelets = facelets
          }}
        />
      </Canvas>
    </div>
  )
}
