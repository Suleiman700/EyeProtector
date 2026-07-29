// Dependency-free app-icon generator (Node built-ins only). Draws EyeProtector's
// brand mark — a diagonal cyan→blue→violet gradient with rounded corners and a
// white eye (outline + pupil) — to build/icon.png (1024×1024, RGBA). Run:
//   node scripts/gen-icon.mjs
// electron-builder derives the platform icons (.icns/.ico/.png) from this file.
import zlib from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const S = 1024
const R = 180 // corner radius
const px = Buffer.alloc(S * S * 4)

const STOPS = [
  [34, 211, 238], // #22D3EE cyan
  [96, 165, 250], // #60A5FA blue
  [167, 139, 250] // #A78BFA violet
]
const lerp = (a, b, t) => Math.round(a + (b - a) * t)
function gradient(t) {
  if (t < 0.5) {
    const u = t / 0.5
    return STOPS[0].map((c, i) => lerp(c, STOPS[1][i], u))
  }
  const u = (t - 0.5) / 0.5
  return STOPS[1].map((c, i) => lerp(c, STOPS[2][i], u))
}

function insideRounded(x, y) {
  const corners = [
    [R, R],
    [S - R, R],
    [R, S - R],
    [S - R, S - R]
  ]
  if (x < R && y < R) return Math.hypot(x - R, y - R) <= R
  if (x > S - R && y < R) return Math.hypot(x - (S - R), y - R) <= R
  if (x < R && y > S - R) return Math.hypot(x - R, y - (S - R)) <= R
  if (x > S - R && y > S - R) return Math.hypot(x - (S - R), y - (S - R)) <= R
  void corners
  return true
}

const cx = S / 2
const cy = S / 2
const rx = 330
const ry = 200
const pupil = 95

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4
    if (!insideRounded(x, y)) {
      px[i + 3] = 0
      continue
    }
    let [r, g, b] = gradient((x + y) / (2 * S))
    const dx = x - cx
    const dy = y - cy
    const norm = Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
    const onRing = Math.abs(norm - 1) < 0.06
    const inPupil = Math.hypot(dx, dy) < pupil
    if (onRing || inPupil) {
      r = 248
      g = 250
      b = 252
    }
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = 255
  }
}

// --- PNG encode (truecolor+alpha, filter 0) ---
const raw = Buffer.alloc(S * (S * 4 + 1))
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0
  px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type RGBA
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

mkdirSync('build', { recursive: true })
writeFileSync('build/icon.png', png)
console.log(`wrote build/icon.png (${png.length} bytes, ${S}x${S})`)
