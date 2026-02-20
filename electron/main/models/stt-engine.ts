import { spawn, execSync } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, chmodSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { getModelPath, getModelsDir } from './manager'
import https from 'https'
import http from 'http'
import { createWriteStream } from 'fs'

const WHISPER_CPP_VERSION = 'v1.8.3'
const WHISPER_CPP_SOURCE_URL = `https://github.com/ggml-org/whisper.cpp/archive/refs/tags/${WHISPER_CPP_VERSION}.tar.gz`

let whisperBinaryPath: string | null = null
let isInstallingBinary = false
let previousContext = ''

export interface WordTimestamp {
  word: string
  start: number
  end: number
}

export interface STTResult {
  text: string
  words: WordTimestamp[]
}

export function resetContext(): void {
  previousContext = ''
}

export function getContext(): string {
  return previousContext
}

function getBinDir(): string {
  const dir = join(getModelsDir(), 'bin')
  mkdirSync(dir, { recursive: true })
  return dir
}

function findWhisperBinary(): string | null {
  if (whisperBinaryPath && existsSync(whisperBinaryPath)) return whisperBinaryPath

  const binDir = getBinDir()
  const localCandidates = [
    join(binDir, 'whisper-cli'),
    join(binDir, 'main'),
    join(binDir, 'whisper'),
  ]

  for (const candidate of localCandidates) {
    if (existsSync(candidate)) {
      whisperBinaryPath = candidate
      return candidate
    }
  }

  try {
    const brewPath = execSync('which whisper-cli 2>/dev/null || which whisper-cpp 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim()
    if (brewPath && existsSync(brewPath)) {
      whisperBinaryPath = brewPath
      return brewPath
    }
  } catch {}

  const brewCandidates = [
    '/opt/homebrew/bin/whisper-cli',
    '/usr/local/bin/whisper-cli',
    '/opt/homebrew/bin/whisper-cpp',
    '/usr/local/bin/whisper-cpp',
  ]
  for (const candidate of brewCandidates) {
    if (existsSync(candidate)) {
      whisperBinaryPath = candidate
      return candidate
    }
  }

  return null
}

async function ensureWhisperBinary(): Promise<string> {
  const existing = findWhisperBinary()
  if (existing) return existing

  if (isInstallingBinary) {
    throw new Error('Whisper CLI is being installed, please wait...')
  }

  isInstallingBinary = true

  try {
    const builtPath = await tryBuildFromSource()
    if (builtPath) {
      whisperBinaryPath = builtPath
      return builtPath
    }

    throw new Error(
      'Could not install whisper-cli automatically. ' +
      'Please install it via Homebrew: brew install whisper-cpp'
    )
  } finally {
    isInstallingBinary = false
  }
}

async function tryBuildFromSource(): Promise<string | null> {
  const hasMake = commandExists('make')
  const hasCMake = commandExists('cmake')
  const hasCC = commandExists('cc') || commandExists('clang')

  if (!hasCC || (!hasMake && !hasCMake)) {
    console.log('Build tools not found, trying Homebrew install...')
    return tryHomebrewInstall()
  }

  const tmpDir = join(app.getPath('temp'), 'syag-whisper-build')
  mkdirSync(tmpDir, { recursive: true })

  const tarPath = join(tmpDir, 'whisper.tar.gz')
  const srcDir = join(tmpDir, `whisper.cpp-${WHISPER_CPP_VERSION.replace('v', '')}`)
  const binDir = getBinDir()
  const destBinary = join(binDir, 'whisper-cli')

  try {
    console.log('Downloading whisper.cpp source...')
    await downloadFile(WHISPER_CPP_SOURCE_URL, tarPath)

    console.log('Extracting source...')
    execSync(`tar xzf "${tarPath}" -C "${tmpDir}"`, { timeout: 30000 })

    if (!existsSync(srcDir)) {
      console.error('Source directory not found after extraction')
      return tryHomebrewInstall()
    }

    const cpuCount = require('os').cpus().length
    const jobs = Math.min(cpuCount, 8)

    if (hasCMake) {
      console.log('Building whisper.cpp with CMake...')
      const buildDir = join(srcDir, 'build')
      mkdirSync(buildDir, { recursive: true })
      execSync(`cmake .. -DCMAKE_BUILD_TYPE=Release -DWHISPER_METAL=ON`, {
        cwd: buildDir,
        timeout: 60000,
        stdio: 'pipe',
      })
      execSync(`cmake --build . --config Release -j ${jobs}`, {
        cwd: buildDir,
        timeout: 300000,
        stdio: 'pipe',
      })

      const cmakeBinCandidates = [
        join(buildDir, 'bin', 'whisper-cli'),
        join(buildDir, 'bin', 'main'),
        join(buildDir, 'whisper-cli'),
        join(buildDir, 'main'),
      ]
      for (const candidate of cmakeBinCandidates) {
        if (existsSync(candidate)) {
          execSync(`cp "${candidate}" "${destBinary}"`)
          chmodSync(destBinary, 0o755)
          console.log('whisper-cli built and installed successfully')
          return destBinary
        }
      }
    }

    if (hasMake && existsSync(join(srcDir, 'Makefile'))) {
      console.log('Building whisper.cpp with Make...')
      execSync(`make -j${jobs}`, {
        cwd: srcDir,
        timeout: 300000,
        stdio: 'pipe',
        env: { ...process.env, WHISPER_METAL: '1' },
      })

      const makeBinCandidates = [
        join(srcDir, 'main'),
        join(srcDir, 'whisper-cli'),
      ]
      for (const candidate of makeBinCandidates) {
        if (existsSync(candidate)) {
          execSync(`cp "${candidate}" "${destBinary}"`)
          chmodSync(destBinary, 0o755)
          console.log('whisper-cli built and installed successfully')
          return destBinary
        }
      }
    }

    console.error('Build succeeded but binary not found')
    return tryHomebrewInstall()
  } catch (err: any) {
    console.error('Build from source failed:', err.message)
    return tryHomebrewInstall()
  } finally {
    try { execSync(`rm -rf "${tmpDir}"`, { timeout: 10000 }) } catch {}
  }
}

function tryHomebrewInstall(): Promise<string | null> {
  return new Promise((resolve) => {
    const brewPaths = ['/opt/homebrew/bin/brew', '/usr/local/bin/brew']
    let brewPath: string | null = null
    for (const p of brewPaths) {
      if (existsSync(p)) { brewPath = p; break }
    }

    if (!brewPath) {
      console.log('Homebrew not found')
      resolve(null)
      return
    }

    console.log('Installing whisper-cpp via Homebrew...')
    try {
      execSync(`"${brewPath}" install whisper-cpp`, {
        timeout: 300000,
        stdio: 'pipe',
      })

      const installed = findWhisperBinary()
      if (installed) {
        console.log('whisper-cpp installed via Homebrew')
        resolve(installed)
      } else {
        resolve(null)
      }
    } catch (err: any) {
      console.error('Homebrew install failed:', err.message)
      resolve(null)
    }
  })
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe', timeout: 3000 })
    return true
  } catch {
    return false
  }
}

function downloadFile(url: string, dest: string, redirectCount = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) { reject(new Error('Too many redirects')); return }

    const client = url.startsWith('https') ? https : http
    client.get(url, { headers: { 'User-Agent': 'Syag/1.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, dest, redirectCount + 1).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const file = createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
      file.on('error', reject)
    }).on('error', reject)
  })
}

export async function processWithLocalSTT(wavBuffer: Buffer, modelId: string, customVocabulary?: string): Promise<STTResult> {
  const modelPath = getModelPath(modelId)
  if (!modelPath) {
    throw new Error(`Model not downloaded: ${modelId}. Please download it from Settings > AI Models.`)
  }

  const binaryPath = await ensureWhisperBinary()

  const tmpDir = join(app.getPath('temp'), 'syag-stt')
  mkdirSync(tmpDir, { recursive: true })
  const tmpFile = join(tmpDir, `chunk-${Date.now()}.wav`)

  try {
    writeFileSync(tmpFile, wavBuffer)
    const result = await runWhisperCLI(binaryPath, modelPath, tmpFile, customVocabulary)

    if (result.text.trim()) {
      previousContext = result.text.trim().slice(-200)
    }

    return result
  } finally {
    try { unlinkSync(tmpFile) } catch {}
  }
}

function runWhisperCLI(binaryPath: string, modelPath: string, audioPath: string, customVocabulary?: string): Promise<STTResult> {
  return new Promise((resolve, reject) => {
    const cpuCount = require('os').cpus().length
    const threadCount = Math.min(8, cpuCount)

    const args = [
      '-m', modelPath,
      '-f', audioPath,
      '--language', 'auto',
      '-t', String(threadCount),
      '--beam-size', '5',
      '--entropy-thold', '2.4',
      '--no-speech-thold', '0.6',
      '--word-thold', '0.01',
      '--max-len', '0',
      '--output-json',
      '--print-special', 'false',
    ]

    // Build prompt: custom vocabulary terms + previous context for bias
    const promptParts: string[] = []
    if (customVocabulary) {
      const terms = customVocabulary.split('\n').map(t => t.trim()).filter(Boolean)
      if (terms.length > 0) promptParts.push(terms.join(', '))
    }
    if (previousContext) promptParts.push(previousContext)
    if (promptParts.length > 0) {
      args.push('--prompt', promptParts.join('. '))
    }

    const proc = spawn(binaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(parseWhisperOutput(stdout, audioPath))
      } else {
        reject(new Error(`whisper.cpp exited with code ${code}: ${stderr.slice(0, 500)}`))
      }
    })

    proc.on('error', reject)
  })
}

function parseWhisperOutput(stdout: string, audioPath: string): STTResult {
  // Try to read JSON output file first (--output-json writes <audioPath>.json)
  const jsonPath = audioPath + '.json'
  try {
    if (existsSync(jsonPath)) {
      const { readFileSync } = require('fs')
      const jsonData = JSON.parse(readFileSync(jsonPath, 'utf-8'))
      const words: WordTimestamp[] = []
      let fullText = ''

      if (jsonData.transcription) {
        for (const segment of jsonData.transcription) {
          if (segment.text) fullText += segment.text
          if (segment.tokens) {
            for (const token of segment.tokens) {
              if (token.text && !token.text.startsWith('[') && !token.text.startsWith('<')) {
                words.push({
                  word: token.text.trim(),
                  start: (token.offsets?.from ?? segment.offsets?.from ?? 0) / 1000,
                  end: (token.offsets?.to ?? segment.offsets?.to ?? 0) / 1000,
                })
              }
            }
          }
        }
      }

      try { unlinkSync(jsonPath) } catch {}

      return {
        text: fullText.trim(),
        words: words.filter(w => w.word.length > 0),
      }
    }
  } catch (err) {
    console.warn('Failed to parse whisper JSON output, falling back to text:', err)
    try { unlinkSync(jsonPath) } catch {}
  }

  // Fallback: parse text output with timestamps
  const words: WordTimestamp[] = []
  const textLines: string[] = []

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('whisper_') || trimmed.startsWith('main:')) continue

    const timestampMatch = trimmed.match(/^\[(\d+:\d+\.\d+)\s*-->\s*(\d+:\d+\.\d+)\]\s*(.+)$/)
    if (timestampMatch) {
      const startTime = parseTimestampToSeconds(timestampMatch[1])
      const endTime = parseTimestampToSeconds(timestampMatch[2])
      const text = timestampMatch[3].trim()
      textLines.push(text)

      const lineWords = text.split(/\s+/).filter(w => w.length > 0)
      const wordDuration = lineWords.length > 0 ? (endTime - startTime) / lineWords.length : 0
      for (let i = 0; i < lineWords.length; i++) {
        words.push({
          word: lineWords[i],
          start: startTime + i * wordDuration,
          end: startTime + (i + 1) * wordDuration,
        })
      }
    } else if (!trimmed.startsWith('[')) {
      textLines.push(trimmed)
    }
  }

  return {
    text: textLines.join(' ').trim(),
    words,
  }
}

function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(':')
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
  }
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
  }
  return parseFloat(ts)
}
