/**
 * Synthetic cube photos for end-to-end tests: the unit-test renderer's output encoded as PNG
 * files, so the app receives them exactly as it would a real upload.
 */
import { deflateSync } from 'node:zlib'
import { mulberry32 } from '../src/cube/state'
import { randomLighting, renderCornerPhoto } from '../src/test/renderer'
import { PHOTO_1_VIEW, PHOTO_2_VIEWS, TYPICAL_CAMERA_DISTANCE } from '../src/vision/views'

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** Minimal PNG writer: 8-bit RGBA, no filtering. */
export function encodePng(rgba: Uint8Array | Uint8ClampedArray, width: number, height: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header.set([8, 6, 0, 0, 0], 8)
  const rows = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    rows[y * (width * 4 + 1)] = 0
    rows.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', new Uint8Array(0)),
  ])
}

const SIZE = 900

/**
 * A photo of one corner, framed exactly where the app places its handles by default
 * (same camera distance, same fill), so a test can accept the grid without dragging.
 */
export function cornerPhoto(state: string, which: 'first' | 0 | 1 | 2, seed: number) {
  const view = which === 'first' ? PHOTO_1_VIEW : PHOTO_2_VIEWS[which]
  const { image } = renderCornerPhoto(state, {
    width: SIZE,
    height: SIZE,
    rotation: view.rotation,
    distance: TYPICAL_CAMERA_DISTANCE,
    fill: 0.78,
    lighting: randomLighting(mulberry32(seed), SIZE, SIZE),
    seed,
  })
  return { name: `cube-${which}.png`, mimeType: 'image/png', buffer: encodePng(image.data, SIZE, SIZE) }
}
