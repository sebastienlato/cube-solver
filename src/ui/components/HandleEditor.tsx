import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { gridPaths } from '../../vision/grid'
import { HANDLE_NAMES, type HandleName, type Handles } from '../../vision/views'
import type { CapturedPhoto } from '../photos'
import { GridOverlay } from './GridOverlay'

const HANDLE_LABEL: Record<HandleName, string> = {
  C: 'near corner, where the three faces meet',
  T: 'top corner',
  TR: 'upper right corner',
  BR: 'lower right corner',
  B: 'bottom corner',
  BL: 'lower left corner',
  TL: 'upper left corner',
}

const LOUPE_SIZE = 124
const LOUPE_ZOOM = 2.4
/** How far above the finger the loupe floats, so the finger doesn't cover it. */
const LOUPE_LIFT = 96

interface Drag {
  name: HandleName
  pointerId: number
  /** Handle position minus pointer position, in image pixels, so the handle doesn't jump to the finger. */
  offsetX: number
  offsetY: number
  /** Touch and pen get the loupe: a finger hides what it is pointing at. */
  loupe: boolean
}

/**
 * The photo with the seven draggable handles and the live sticker grid. Everything inside the
 * <svg> is in the photo's own pixel coordinates, so what is drawn is what will be sampled.
 */
export function HandleEditor({
  photo,
  onChange,
}: {
  photo: CapturedPhoto
  onChange: (handles: Handles) => void
}) {
  const frame = useRef<HTMLDivElement>(null)
  const picture = useRef<HTMLCanvasElement>(null)
  const overlay = useRef<SVGSVGElement>(null)
  const loupe = useRef<HTMLCanvasElement>(null)
  const [fit, setFit] = useState({ width: 0, height: 0 })
  const [drag, setDrag] = useState<Drag | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  const { width, height } = photo.canvas
  const { handles } = photo
  /** Photo pixels per CSS pixel: overlay sizes are given in CSS pixels and converted. */
  const k = fit.width > 0 ? width / fit.width : 1

  // Fit the photo inside whatever space the layout leaves, keeping its shape.
  useLayoutEffect(() => {
    const element = frame.current
    if (!element) return
    const measure = () => {
      const scale = Math.min(element.clientWidth / width, element.clientHeight / height)
      setFit({ width: Math.floor(width * scale), height: Math.floor(height * scale) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [width, height])

  useEffect(() => {
    picture.current?.getContext('2d')?.drawImage(photo.canvas, 0, 0)
  }, [photo.canvas, photo.id])

  // Magnified view of the photo around the handle being dragged, with the grid drawn over it.
  useEffect(() => {
    const canvas = loupe.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !drag?.loupe) return
    const ratio = window.devicePixelRatio || 1
    const size = LOUPE_SIZE * ratio
    canvas.width = canvas.height = size
    const { x, y } = handles[drag.name]
    const span = (LOUPE_SIZE / LOUPE_ZOOM) * k
    const scale = size / span
    context.fillStyle = '#000'
    context.fillRect(0, 0, size, size)
    context.setTransform(scale, 0, 0, scale, size / 2 - x * scale, size / 2 - y * scale)
    context.imageSmoothingQuality = 'high'
    context.drawImage(photo.canvas, 0, 0)
    const { outline, inner } = gridPaths(handles)
    const lines = new Path2D(outline + inner)
    context.lineCap = 'round'
    context.strokeStyle = 'rgba(0,0,0,0.5)'
    context.lineWidth = (3.2 * ratio) / scale
    context.stroke(lines)
    context.strokeStyle = '#fff'
    context.lineWidth = (1.4 * ratio) / scale
    context.stroke(lines)
    context.setTransform(1, 0, 0, 1, 0, 0)
  }, [drag, handles, k, photo.canvas])

  const toImage = (event: { clientX: number; clientY: number }) => {
    const rect = overlay.current!.getBoundingClientRect()
    return { x: ((event.clientX - rect.left) / rect.width) * width, y: ((event.clientY - rect.top) / rect.height) * height }
  }

  const move = (name: HandleName, x: number, y: number) =>
    onChange({
      ...handles,
      [name]: { x: Math.min(width, Math.max(0, x)), y: Math.min(height, Math.max(0, y)) },
    })

  const onPointerDown = (event: PointerEvent<SVGGElement>, name: HandleName) => {
    event.preventDefault()
    overlay.current?.setPointerCapture(event.pointerId)
    const at = toImage(event)
    setPointer({ x: event.clientX, y: event.clientY })
    setDrag({
      name,
      pointerId: event.pointerId,
      offsetX: handles[name].x - at.x,
      offsetY: handles[name].y - at.y,
      loupe: event.pointerType !== 'mouse',
    })
  }

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag || event.pointerId !== drag.pointerId) return
    const at = toImage(event)
    setPointer({ x: event.clientX, y: event.clientY })
    move(drag.name, at.x + drag.offsetX, at.y + drag.offsetY)
  }

  const endDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (drag && event.pointerId === drag.pointerId) setDrag(null)
  }

  const onKeyDown = (event: KeyboardEvent<SVGGElement>, name: HandleName) => {
    const direction: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const step = direction[event.key]
    if (!step) return
    event.preventDefault()
    // One CSS pixel per press, ten with Shift.
    const distance = (event.shiftKey ? 10 : 1) * k
    move(name, handles[name].x + step[0] * distance, handles[name].y + step[1] * distance)
  }

  const loupeAbove = pointer.y - LOUPE_LIFT - LOUPE_SIZE / 2 > 8
  const loupeLeft = Math.min(window.innerWidth - LOUPE_SIZE - 8, Math.max(8, pointer.x - LOUPE_SIZE / 2))
  const loupeTop = loupeAbove ? pointer.y - LOUPE_LIFT - LOUPE_SIZE / 2 : pointer.y + LOUPE_LIFT - LOUPE_SIZE / 2

  return (
    <div ref={frame} className="grid size-full place-items-center">
      <div className="relative overflow-hidden rounded-xl bg-black" style={{ width: fit.width, height: fit.height }}>
        <canvas ref={picture} width={width} height={height} className="block size-full" aria-hidden="true" />
        <svg
          ref={overlay}
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 size-full touch-none select-none"
          role="group"
          aria-label="Photo of the cube with seven handles. Move each handle to a corner of the cube."
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <GridOverlay handles={handles} lineWidth={1.5 * k} />
          {HANDLE_NAMES.map((name) => {
            const active = drag?.name === name
            return (
              <g
                key={name}
                data-handle={name}
                transform={`translate(${handles[name].x} ${handles[name].y})`}
                role="button"
                tabIndex={0}
                aria-label={`Handle for the ${HANDLE_LABEL[name]}. Arrow keys move it.`}
                className="cursor-grab outline-none active:cursor-grabbing [&:focus-visible>.ring]:stroke-[var(--iris)]"
                onPointerDown={(event) => onPointerDown(event, name)}
                onKeyDown={(event) => onKeyDown(event, name)}
              >
                {/* A finger-sized target around a small visible dot. */}
                <circle r={24 * k} fill="transparent" />
                <circle r={11 * k} fill="rgba(0,0,0,0.35)" />
                <circle
                  className="ring"
                  r={9 * k}
                  fill={active ? 'var(--iris)' : 'rgba(255,255,255,0.18)'}
                  stroke="#fff"
                  strokeWidth={2.5 * k}
                />
                <circle r={1.8 * k} fill="#fff" />
              </g>
            )
          })}
        </svg>
      </div>

      {drag?.loupe && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 overflow-hidden rounded-full shadow-[0_0_0_3px_#fff,0_8px_24px_rgba(0,0,0,0.45)]"
          style={{ width: LOUPE_SIZE, height: LOUPE_SIZE, left: loupeLeft, top: loupeTop }}
        >
          <canvas ref={loupe} className="block size-full" />
          <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--iris)]" />
        </div>
      )}
    </div>
  )
}
