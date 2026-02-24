/**
 * One-off: keep only the black spiral and waves in the tray icon image;
 * make everything else (dotted/light/noise) transparent.
 * Output: public/tray-icon-cleaned.png for review.
 * Run: node scripts/clean-tray-icon.js [source.png]
 * Default source: public/tray-icon-source.png
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const defaultSource = path.join(root, 'public', 'tray-icon-source.png')
const outPath = path.join(root, 'public', 'tray-icon-cleaned.png')

// Pixels with luminance at or below this (0–255) are kept; rest become transparent (removes dots/background)
const LUMINANCE_THRESHOLD = 40

function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) | 0
}

async function main() {
  const sourcePath = process.argv[2] || defaultSource
  if (!fs.existsSync(sourcePath)) {
    console.error('Source image not found:', sourcePath)
    console.error('Usage: node scripts/clean-tray-icon.js [source.png]')
    process.exit(1)
  }

  const { data, info } = await sharp(sourcePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = luminance(r, g, b)
    if (lum > LUMINANCE_THRESHOLD) {
      data[i + 3] = 0
    }
  }

  await sharp(Buffer.from(data), {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 6 })
    .toFile(outPath)

  console.log('Wrote', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
