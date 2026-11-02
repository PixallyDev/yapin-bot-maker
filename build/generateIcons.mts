import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = new URL('../', import.meta.url)
const svg = await readFile(new URL('resources/icon.svg', root))
const png = (size: number): Buffer =>
  Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng())

// Windows ICO frames use lossless PNG images at each native taskbar/shortcut size.
const sizes = [16, 24, 32, 48, 64, 128, 256]
const frames = sizes.map(png)
const header = Buffer.alloc(6 + sizes.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = header.length
for (let index = 0; index < sizes.length; index++) {
  const entry = 6 + index * 16
  header[entry] = sizes[index] === 256 ? 0 : sizes[index]
  header[entry + 1] = header[entry]
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(frames[index].length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += frames[index].length
}
await writeFile(new URL('build/icon.ico', root), Buffer.concat([header, ...frames]))

// Modern macOS ICNS also stores lossless PNG representations.
const representations = [
  ['icp4', 16],
  ['icp5', 32],
  ['icp6', 64],
  ['ic07', 128],
  ['ic08', 256],
  ['ic09', 512],
  ['ic10', 1024]
] as const
const chunks = representations.map(([type, size]) => {
  const image = png(size)
  const entry = Buffer.alloc(8)
  entry.write(type, 0, 'ascii')
  entry.writeUInt32BE(image.length + 8, 4)
  return Buffer.concat([entry, image])
})
const icns = Buffer.alloc(8)
icns.write('icns', 0, 'ascii')
icns.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4)
await writeFile(new URL('build/icon.icns', root), Buffer.concat([icns, ...chunks]))
await writeFile(new URL('build/icon.png', root), png(1024))
await writeFile(new URL('resources/icon.png', root), png(512))
console.log(`Generated app icons from ${fileURLToPath(new URL('resources/icon.svg', root))}`)
