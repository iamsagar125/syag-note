/**
 * Strip white (and near-white) background from an image; output stays RGBA with transparency.
 * Used for Mac app (Dock) icon so the icon has no white box.
 * Run: node scripts/strip-white-background.js <input.png> [output.png]
 * Default output: public/dock-icon.png
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const defaultOut = path.join(root, 'public', 'dock-icon.png');

// Pixels with luminance above this become transparent (removes white background)
const WHITE_THRESHOLD = 248;

function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) | 0;
}

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3] || defaultOut;
  if (!inputPath || !fs.existsSync(inputPath)) {
    console.error('Usage: node scripts/strip-white-background.js <input.png> [output.png]');
    process.exit(1);
  }

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = luminance(r, g, b);
    if (lum >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  await sharp(Buffer.from(data), { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toFile(outputPath);

  console.log('Wrote', outputPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
