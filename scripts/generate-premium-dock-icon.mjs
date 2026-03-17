/**
 * Generate premium dock icon with calligraphic S monogram.
 *
 * Strategy: define the S spine as cubic bezier segments, then offset
 * each side by varying amounts to create thick/thin calligraphic variation.
 * Render with sharp; create .icns with iconutil.
 *
 * Run: node scripts/generate-premium-dock-icon.mjs
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// ─── Evaluate a cubic bezier at parameter t ───
function cubicBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t
  return [
    mt*mt*mt*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t*t*t*p3[0],
    mt*mt*mt*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t*t*t*p3[1],
  ]
}

// Derivative of cubic bezier
function cubicBezierDeriv(p0, p1, p2, p3, t) {
  const mt = 1 - t
  return [
    3*mt*mt*(p1[0]-p0[0]) + 6*mt*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0]),
    3*mt*mt*(p1[1]-p0[1]) + 6*mt*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1]),
  ]
}

// Normal vector (perpendicular to tangent, pointing left of direction)
function normal(dx, dy) {
  const len = Math.sqrt(dx*dx + dy*dy)
  if (len < 0.0001) return [0, 0]
  return [-dy/len, dx/len]
}

/**
 * Define the S spine as a sequence of cubic bezier segments.
 * Each segment: [startPt, cp1, cp2, endPt]
 *
 * The S flows from top-right terminal down through the crossover to
 * the bottom-left terminal.
 */
function getSpineSegments() {
  // The spine of the S, going from top terminal to bottom terminal.
  // Coordinates in a 1024x1024 space, centered around (512, 512).
  return [
    // Segment 0: Top terminal - gentle start curving left
    [[588, 240], [570, 232], [530, 220], [480, 222]],

    // Segment 1: Upper left curve - the top bowl
    [[480, 222], [410, 226], [340, 264], [330, 330]],

    // Segment 2: Transition from upper bowl through crossover
    [[330, 330], [320, 395], [370, 430], [440, 458]],

    // Segment 3: Crossover - diagonal moving right and down
    [[440, 458], [500, 482], [555, 510], [590, 545]],

    // Segment 4: Lower right curve - the bottom bowl
    [[590, 545], [640, 592], [665, 660], [640, 720]],

    // Segment 5: Lower bowl continuing left
    [[640, 720], [615, 775], [555, 808], [490, 800]],

    // Segment 6: Bottom terminal - tapering finish
    [[490, 800], [440, 794], [400, 772], [378, 748]],
  ]
}

/**
 * Width profile along the S spine.
 * Returns half-width at a given normalized position (0=top, 1=bottom).
 * Thick at the belly of curves, thin at crossover and terminals.
 */
function halfWidthAt(normalizedT) {
  const t = normalizedT
  // Terminal taper at top (0) and bottom (1)
  // Thick at upper bowl (~0.25) and lower bowl (~0.75)
  // Thin at crossover (~0.5)

  // Use a smooth function:
  // Terminals: thin ~14px half-width
  // Upper/lower belly: thick ~34px half-width
  // Crossover center: medium-thin ~20px half-width

  const terminalWidth = 12
  const bellyWidth = 35
  const crossoverWidth = 22

  // Piecewise smooth interpolation
  if (t < 0.05) {
    // Top terminal taper
    return terminalWidth * 0.5 + (terminalWidth * 0.5) * (t / 0.05)
  } else if (t < 0.25) {
    // Expanding to upper belly
    const s = (t - 0.05) / 0.20
    return terminalWidth + (bellyWidth - terminalWidth) * smoothstep(s)
  } else if (t < 0.42) {
    // Upper belly to crossover
    const s = (t - 0.25) / 0.17
    return bellyWidth + (crossoverWidth - bellyWidth) * smoothstep(s)
  } else if (t < 0.58) {
    // Crossover region
    const s = (t - 0.42) / 0.16
    return crossoverWidth + (crossoverWidth - crossoverWidth) * smoothstep(s) // stays at crossover width
  } else if (t < 0.75) {
    // Expanding to lower belly
    const s = (t - 0.58) / 0.17
    return crossoverWidth + (bellyWidth - crossoverWidth) * smoothstep(s)
  } else if (t < 0.95) {
    // Lower belly to bottom terminal
    const s = (t - 0.75) / 0.20
    return bellyWidth + (terminalWidth - bellyWidth) * smoothstep(s)
  } else {
    // Bottom terminal taper
    const s = (t - 0.95) / 0.05
    return terminalWidth * (1 - s * 0.5)
  }
}

function smoothstep(t) {
  t = Math.max(0, Math.min(1, t))
  return t * t * (3 - 2 * t)
}

/**
 * Sample the spine at many points, compute left and right offset edges,
 * then build a filled SVG path from them.
 */
function buildCalligraphicSPath() {
  const segments = getSpineSegments()
  const totalSegments = segments.length
  const samplesPerSegment = 20
  const totalSamples = totalSegments * samplesPerSegment + 1

  const leftEdge = []
  const rightEdge = []

  for (let seg = 0; seg < totalSegments; seg++) {
    const [p0, p1, p2, p3] = segments[seg]
    const stepsInSeg = (seg === totalSegments - 1) ? samplesPerSegment + 1 : samplesPerSegment

    for (let i = 0; i < stepsInSeg; i++) {
      const t = i / samplesPerSegment
      const pt = cubicBezier(p0, p1, p2, p3, t)
      const d = cubicBezierDeriv(p0, p1, p2, p3, t)
      const n = normal(d[0], d[1])

      const globalT = (seg * samplesPerSegment + i) / (totalSamples - 1)
      const hw = halfWidthAt(globalT)

      leftEdge.push([pt[0] + n[0] * hw, pt[1] + n[1] * hw])
      rightEdge.push([pt[0] - n[0] * hw, pt[1] - n[1] * hw])
    }
  }

  // Build path: left edge forward, then right edge backward
  let d = `M ${leftEdge[0][0].toFixed(1)} ${leftEdge[0][1].toFixed(1)}`
  for (let i = 1; i < leftEdge.length; i++) {
    d += ` L ${leftEdge[i][0].toFixed(1)} ${leftEdge[i][1].toFixed(1)}`
  }
  // Connect to last point of right edge
  d += ` L ${rightEdge[rightEdge.length-1][0].toFixed(1)} ${rightEdge[rightEdge.length-1][1].toFixed(1)}`
  // Right edge backward
  for (let i = rightEdge.length - 2; i >= 0; i--) {
    d += ` L ${rightEdge[i][0].toFixed(1)} ${rightEdge[i][1].toFixed(1)}`
  }
  d += ' Z'

  return d
}

function generateSVG() {
  const sPath = buildCalligraphicSPath()

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#232325"/>
      <stop offset="100%" stop-color="#151517"/>
    </linearGradient>

    <linearGradient id="copperGrad" x1="0" y1="0.12" x2="0" y2="0.88">
      <stop offset="0%" stop-color="#E0B88E"/>
      <stop offset="25%" stop-color="#C8956C"/>
      <stop offset="60%" stop-color="#AE7A50"/>
      <stop offset="100%" stop-color="#946040"/>
    </linearGradient>

    <linearGradient id="sheenGrad" x1="0.15" y1="0" x2="0.6" y2="0.45">
      <stop offset="0%" stop-color="#F4DEC4" stop-opacity="0.28"/>
      <stop offset="45%" stop-color="#C8956C" stop-opacity="0"/>
      <stop offset="100%" stop-color="#946040" stop-opacity="0"/>
    </linearGradient>

    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="26"/>
    </filter>

    <filter id="shadow" x="-10%" y="-5%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#000" flood-opacity="0.50"/>
    </filter>

    <clipPath id="iconClip">
      <rect width="1024" height="1024" rx="225" ry="225"/>
    </clipPath>
  </defs>

  <g clip-path="url(#iconClip)">
    <!-- Dark background with subtle gradient -->
    <rect width="1024" height="1024" fill="url(#bgGrad)"/>
    <!-- Inner edge for definition -->
    <rect x="1" y="1" width="1022" height="1022" fill="none" stroke="#000" stroke-width="2" stroke-opacity="0.3" rx="224" ry="224"/>
    <!-- Subtle top highlight for depth -->
    <ellipse cx="512" cy="260" rx="380" ry="260" fill="#fff" opacity="0.015"/>

    <!-- Soft copper glow -->
    <g filter="url(#glow)" opacity="0.12">
      <path d="${sPath}" fill="#C8956C"/>
    </g>

    <!-- Calligraphic S with drop shadow -->
    <g filter="url(#shadow)">
      <path d="${sPath}" fill="url(#copperGrad)"/>
    </g>

    <!-- Premium sheen overlay -->
    <path d="${sPath}" fill="url(#sheenGrad)"/>
  </g>
</svg>`
}

async function main() {
  console.log('Generating calligraphic S path...')
  const svgContent = generateSVG()

  // Write SVG
  const svgPath = path.join(root, 'public', 'dock-icon-premium.svg')
  fs.writeFileSync(svgPath, svgContent, 'utf8')
  console.log('Wrote', svgPath)

  // Render 1024x1024 PNG
  console.log('Rendering 1024x1024 PNG...')
  const png1024 = await sharp(Buffer.from(svgContent))
    .resize(1024, 1024)
    .png({ compressionLevel: 6 })
    .toBuffer()

  const dockIconPath = path.join(root, 'public', 'dock-icon-1024.png')
  fs.writeFileSync(dockIconPath, png1024)
  console.log('Wrote', dockIconPath)

  // Render 128x128 in-app logo
  console.log('Rendering 128x128 in-app logo...')
  const png128 = await sharp(Buffer.from(svgContent))
    .resize(128, 128)
    .png({ compressionLevel: 6 })
    .toBuffer()

  for (const p of [
    path.join(root, 'src', 'assets', 'syag-logo-inapp.png'),
    path.join(root, 'public', 'syag-logo-inapp.png'),
  ]) {
    fs.writeFileSync(p, png128)
    console.log('Wrote', p)
  }

  // Generate .icns
  console.log('Generating .icns...')
  const resourcesDir = path.join(root, 'electron', 'resources')
  const iconsetDir = path.join(resourcesDir, 'icon.iconset')
  fs.mkdirSync(iconsetDir, { recursive: true })

  const entries = [
    [16, 'icon_16x16.png'],
    [32, 'icon_16x16@2x.png'],
    [32, 'icon_32x32.png'],
    [64, 'icon_32x32@2x.png'],
    [128, 'icon_128x128.png'],
    [256, 'icon_128x128@2x.png'],
    [256, 'icon_256x256.png'],
    [512, 'icon_256x256@2x.png'],
    [512, 'icon_512x512.png'],
    [1024, 'icon_512x512@2x.png'],
  ]

  fs.writeFileSync(path.join(iconsetDir, 'icon_512x512@2x.png'), png1024)

  for (const [size, name] of entries) {
    if (name === 'icon_512x512@2x.png') continue
    const buf = await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png({ compressionLevel: 6 })
      .toBuffer()
    fs.writeFileSync(path.join(iconsetDir, name), buf)
  }

  const icnsPath = path.join(resourcesDir, 'icon.icns')
  try {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'inherit' })
    console.log('Wrote', icnsPath)
  } catch (e) {
    console.error('iconutil failed:', e.message)
    process.exit(1)
  }

  fs.rmSync(iconsetDir, { recursive: true })
  console.log('Cleaned up icon.iconset')

  console.log('\nDone! Updated files:')
  console.log('  public/dock-icon-1024.png')
  console.log('  public/dock-icon-premium.svg')
  console.log('  src/assets/syag-logo-inapp.png')
  console.log('  public/syag-logo-inapp.png')
  console.log('  electron/resources/icon.icns')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
