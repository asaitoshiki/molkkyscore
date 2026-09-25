// Android のランチャーアイコンを依存ライブラリなしで生成する。
// スキットル 3 本とモルック棒を図案化したもので、Web の favicon と同じ形。
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const BG = [29, 82, 64]
const MARK = [243, 244, 241]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

const crc32 = (buffer) => {
  let c = 0xffffffff
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return c ^ 0xffffffff
}

const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([length, body, crc])
}

/** RGBA の画素配列を PNG にまとめる */
const encodePng = (size, pixels) => {
  const stride = size * 4
  const raw = Buffer.alloc(size * (stride + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** 角丸長方形の内側判定 */
const inRoundRect = (x, y, left, top, width, height, radius) => {
  const cx = Math.min(Math.max(x, left + radius), left + width - radius)
  const cy = Math.min(Math.max(y, top + radius), top + height - radius)
  const inside = x >= left && x < left + width && y >= top && y < top + height
  return inside && (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 + radius * 2
}

/**
 * 100 四方の座標系で図案を描く。
 * 戻り値は 'mark'（図案）、'gap'（棒のまわりの縁）、null（何もない）。
 */
const markAt = (rawX, rawY) => {
  // 図案の重心は座標系の中心とずれているため、描く前に寄せる
  const x = rawX - 4.5
  const y = rawY - 6.5
  const onPin = [30, 48, 66].some((left) => inRoundRect(x, y, left, 38, 13, 40, 6))
  const distanceToStick = Math.abs(y - (x * -0.45 + 46))
  const withinStick = x > 12 && x < 74
  if (distanceToStick < 4 && withinStick) return 'mark'
  if (distanceToStick < 6.5 && withinStick) return 'gap'
  return onPin ? 'mark' : null
}

/**
 * @param size 出力の一辺
 * @param shape 'square' | 'round' | 'adaptive'
 *   adaptive は背景を透明にし、図案を内側の安全領域に収める
 */
const render = (size, shape) => {
  const pixels = Buffer.alloc(size * size * 4)
  const scale = shape === 'adaptive' ? 0.66 : 1
  const offset = (size * (1 - scale)) / 2
  const radius = size / 2

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inCircle = (x - radius + 0.5) ** 2 + (y - radius + 0.5) ** 2 <= radius ** 2
      const outside = shape === 'round' && !inCircle
      const local = markAt(((x - offset) / (size * scale)) * 100, ((y - offset) / (size * scale)) * 100)

      // 透明にするのは、丸アイコンの外側と、背景を持たないアダプティブの地
      const transparent = outside || (shape === 'adaptive' && local !== 'mark')
      const color = local === 'mark' ? MARK : BG

      const at = (y * size + x) * 4
      pixels[at] = color[0]
      pixels[at + 1] = color[1]
      pixels[at + 2] = color[2]
      pixels[at + 3] = transparent ? 0 : 255
    }
  }
  return encodePng(size, pixels)
}

// ランチャーは各密度、アダプティブの前景は 108dp 相当
const DENSITIES = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
]

const base = new URL('../android/app/src/main/res/', import.meta.url)
for (const [density, launcher, foreground] of DENSITIES) {
  const dir = new URL(`mipmap-${density}/`, base)
  mkdirSync(dir, { recursive: true })
  writeFileSync(new URL('ic_launcher.png', dir), render(launcher, 'square'))
  writeFileSync(new URL('ic_launcher_round.png', dir), render(launcher, 'round'))
  writeFileSync(new URL('ic_launcher_foreground.png', dir), render(foreground, 'adaptive'))
}
console.log('android icons written')
