// PWA 用アイコンを依存ライブラリなしで生成する。スキットル 3 本とモルック棒を図案化したもの。
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [29, 82, 64]
const PIN = [243, 244, 241]
const STICK = [243, 244, 241]

const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body) >>> 0)
  return Buffer.concat([length, body, crc])
}

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

/** 角丸長方形の内側判定 */
const inRoundRect = (x, y, left, top, width, height, radius) => {
  const cx = Math.min(Math.max(x, left + radius), left + width - radius)
  const cy = Math.min(Math.max(y, top + radius), top + height - radius)
  const inside = x >= left && x < left + width && y >= top && y < top + height
  return inside && (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 + radius * 2
}

const render = (size) => {
  const unit = size / 100
  const pixels = Buffer.alloc(size * size * 3)

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // スキットル 3 本を横に並べ、右上から斜めにモルック棒を重ねる
      const pinIndex = [30, 48, 66].findIndex((left) =>
        inRoundRect(x, y, left * unit, 38 * unit, 13 * unit, 40 * unit, 6 * unit),
      )
      // 棒はスキットルと同色なので、まわりに地色の縁を残して重なりを見せる
      const distanceToStick = Math.abs(y - (x * -0.45 + 46 * unit))
      const withinStickSpan = x > 12 * unit && x < 74 * unit
      const onStick = distanceToStick < 4 * unit && withinStickSpan
      const onStickEdge = distanceToStick < 6.5 * unit && withinStickSpan
      const color = onStick ? STICK : onStickEdge ? BG : pinIndex >= 0 ? PIN : BG

      const offset = (y * size + x) * 3
      pixels[offset] = color[0]
      pixels[offset + 1] = color[1]
      pixels[offset + 2] = color[2]
    }
  }

  // 各行の先頭にフィルタ種別 0 を入れて raw scanline にする
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0
    pixels.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), render(size))
}
console.log('icons written')
