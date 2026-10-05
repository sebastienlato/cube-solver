import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { HANDLE_NAMES, guideHandles, type Handles } from '../../vision/views'
import { cameraProblemFrom, type CameraProblem } from '../camera'
import { storePhoto, type CapturedPhoto } from '../photos'
import { GridOverlay } from './GridOverlay'

export interface CameraHandle {
  /** Grabs the current frame into the given photo slot, with handles where the guide was. */
  capture: (slot: 0 | 1) => CapturedPhoto | null
  switchCamera: () => void
}

interface CameraViewProps {
  /** Height of whatever overlays the top of the preview, so the guide is centered in the clear part. */
  topInset: number
  onProblem: (problem: CameraProblem) => void
  onReady: (cameraCount: number) => void
  className?: string
}

/** Full-bleed rear-camera preview with the cube-corner guide drawn over it. */
export const CameraView = forwardRef<CameraHandle, CameraViewProps>(function CameraView(
  { topInset, onProblem, onReady, className = '' },
  ref,
) {
  const container = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const cameras = useRef<string[]>([])
  const [cameraIndex, setCameraIndex] = useState<number | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const callbacks = useRef({ onProblem, onReady })
  useLayoutEffect(() => {
    callbacks.current = { onProblem, onReady }
  })

  useLayoutEffect(() => {
    const element = container.current
    if (!element) return
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    const deviceId = cameraIndex === null ? undefined : cameras.current[cameraIndex]
    const wanted = { width: { ideal: 1920 }, height: { ideal: 1440 } }

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: deviceId ? { ...wanted, deviceId: { exact: deviceId } } : { ...wanted, facingMode: { ideal: 'environment' } },
      })
      .then(async (media) => {
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream.current = media
        const element = video.current
        if (element) {
          element.srcObject = media
          await element.play().catch(() => undefined)
        }
        // Device ids are only listed once permission has been given.
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return
        cameras.current = devices.filter((device) => device.kind === 'videoinput').map((device) => device.deviceId)
        callbacks.current.onReady(cameras.current.length)
      })
      .catch((error: unknown) => {
        if (!cancelled) callbacks.current.onProblem(cameraProblemFrom(error))
      })

    return () => {
      cancelled = true
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
    }
  }, [cameraIndex])

  const guide: Handles | null =
    size.width > 0
      ? (() => {
          const clear = guideHandles(size.width, size.height - topInset, 0.84)
          return Object.fromEntries(
            HANDLE_NAMES.map((name) => [name, { x: clear[name].x, y: clear[name].y + topInset }]),
          ) as Handles
        })()
      : null

  useImperativeHandle(ref, () => ({
    capture(slot) {
      const element = video.current
      if (!element || !guide || element.videoWidth === 0) return null
      // The preview is cropped to cover the screen; undo that to find the guide in the full frame.
      const cover = Math.max(size.width / element.videoWidth, size.height / element.videoHeight)
      const offsetX = (size.width - element.videoWidth * cover) / 2
      const offsetY = (size.height - element.videoHeight * cover) / 2
      return storePhoto(slot, element, element.videoWidth, element.videoHeight, {
        handles: (scale) =>
          Object.fromEntries(
            HANDLE_NAMES.map((name) => [
              name,
              { x: ((guide[name].x - offsetX) / cover) * scale, y: ((guide[name].y - offsetY) / cover) * scale },
            ]),
          ) as Handles,
      })
    },
    switchCamera() {
      if (cameras.current.length < 2) return
      const active = stream.current?.getVideoTracks()[0]?.getSettings().deviceId
      const current = Math.max(0, cameras.current.indexOf(active ?? ''))
      setCameraIndex((current + 1) % cameras.current.length)
    },
  }))

  return (
    <div ref={container} className={`overflow-hidden bg-black ${className}`}>
      <video ref={video} playsInline muted autoPlay className="size-full object-cover" aria-label="Camera preview" />
      {guide && (
        <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
          <GridOverlay handles={guide} lineWidth={1.4} />
        </svg>
      )}
    </div>
  )
})
