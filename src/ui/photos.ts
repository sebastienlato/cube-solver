/**
 * The two photos of a scan. They live in memory only, for the length of the visit: never in
 * storage, never sent anywhere.
 */
import { useSyncExternalStore } from 'react'
import type { Raster } from '../vision/sample'
import { HANDLE_NAMES, guideHandles, type Handles } from '../vision/views'

/** Longest side, in pixels, of the copy that is displayed and analyzed. Phone photos are far larger than needed. */
export const MAX_PROCESSING_SIDE = 1600

export interface CapturedPhoto {
  id: number
  /** Downscaled copy used for display, the loupe and color sampling. */
  canvas: HTMLCanvasElement
  pixels: Raster
  handles: Handles
  /** The file as the user gave it, kept only while the page is open. */
  original: Blob | null
}

type Slot = 0 | 1

let photos: readonly [CapturedPhoto | null, CapturedPhoto | null] = [null, null]
let nextId = 1
const listeners = new Set<() => void>()

const emit = () => {
  for (const listener of listeners) listener()
}

export const getPhotos = () => photos

export function usePhotos() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => photos,
  )
}

function setPhoto(slot: Slot, photo: CapturedPhoto | null): void {
  photos = slot === 0 ? [photo, photos[1]] : [photos[0], photo]
  emit()
}

export const clearPhoto = (slot: Slot): void => setPhoto(slot, null)

export function clearAllPhotos(): void {
  photos = [null, null]
  emit()
}

export function setHandles(slot: Slot, handles: Handles): void {
  const photo = photos[slot]
  if (photo) setPhoto(slot, { ...photo, handles })
}

/** Draws any image source into a canvas no larger than the processing size and stores it. */
export function storePhoto(
  slot: Slot,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: { handles?: (scale: number) => Handles; original?: Blob | null } = {},
): CapturedPhoto {
  const scale = Math.min(1, MAX_PROCESSING_SIDE / Math.max(sourceWidth, sourceHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceWidth * scale))
  canvas.height = Math.max(1, Math.round(sourceHeight * scale))
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('This browser could not prepare the photo.')
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  const photo: CapturedPhoto = {
    id: nextId++,
    canvas,
    pixels: context.getImageData(0, 0, canvas.width, canvas.height),
    handles: options.handles?.(scale) ?? guideHandles(canvas.width, canvas.height),
    original: options.original ?? null,
  }
  setPhoto(slot, photo)
  return photo
}

/** Decodes an uploaded file, respecting its EXIF rotation, and stores it. */
export async function storeUploadedPhoto(slot: Slot, file: Blob): Promise<CapturedPhoto> {
  let source: ImageBitmap | HTMLImageElement
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Some browsers can't make a bitmap from every format they can display; an <img> can.
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('That file could not be opened as a photo.'))
      }
      image.src = url
    })
  }
  const photo = storePhoto(slot, source, source.width, source.height, { original: file })
  if ('close' in source) source.close()
  return photo
}

/** Identifies a scan's inputs, so going back and forward without changes keeps the user's edits. */
export function scanInputKey(first: CapturedPhoto, second: CapturedPhoto): string {
  const describe = (photo: CapturedPhoto) =>
    `${photo.id}:${HANDLE_NAMES.map((name) => `${Math.round(photo.handles[name].x)},${Math.round(photo.handles[name].y)}`).join(';')}`
  return `${describe(first)}|${describe(second)}`
}
