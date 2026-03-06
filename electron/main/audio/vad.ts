import { join } from 'path'
import { existsSync } from 'fs'
import { getModelsDir, downloadModel } from '../models/manager'
import { probsToSegments, type VADSegment } from '@/lib/vad-segments'

export type { VADSegment } from '@/lib/vad-segments'

let ortSession: any = null
let ortLoaded = false

const WINDOW_SIZE_SAMPLES = 512

function getVADModelPath(): string {
  return join(getModelsDir(), 'silero_vad.onnx')
}

export async function ensureVADModel(): Promise<void> {
  const modelPath = getVADModelPath()
  if (existsSync(modelPath)) return

  console.log('Auto-downloading Silero VAD model...')
  await downloadModel('silero-vad', () => {})
}

async function getORTSession(): Promise<any> {
  if (ortSession) return ortSession

  const modelPath = getVADModelPath()
  if (!existsSync(modelPath)) {
    await ensureVADModel()
  }

  if (!ortLoaded) {
    try {
      const ort = require('onnxruntime-node')
      ortSession = await ort.InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
      })
      ortLoaded = true
    } catch (err: any) {
      console.error('Failed to load ONNX runtime or VAD model:', err.message)
      throw new Error('onnxruntime-node is required for VAD. Install with: npm install onnxruntime-node')
    }
  }

  return ortSession
}

export async function runVAD(audio: Float32Array, sampleRate: number): Promise<VADSegment[]> {
  let session: any
  try {
    session = await getORTSession()
  } catch {
    return [{ start: 0, end: audio.length / sampleRate }]
  }

  const ort = require('onnxruntime-node')

  // Resample to 16kHz if needed
  let samples = audio
  if (sampleRate !== 16000) {
    const ratio = 16000 / sampleRate
    const newLen = Math.floor(audio.length * ratio)
    samples = new Float32Array(newLen)
    for (let i = 0; i < newLen; i++) {
      const srcIdx = i / ratio
      const idx = Math.floor(srcIdx)
      const frac = srcIdx - idx
      samples[i] = idx + 1 < audio.length
        ? audio[idx] * (1 - frac) + audio[idx + 1] * frac
        : audio[idx]
    }
  }

  const speechProbs: number[] = []

  // Initialize hidden states for Silero VAD v5
  let h = new ort.Tensor('float32', new Float32Array(2 * 1 * 64).fill(0), [2, 1, 64])
  let c = new ort.Tensor('float32', new Float32Array(2 * 1 * 64).fill(0), [2, 1, 64])
  const sr = new ort.Tensor('int64', BigInt64Array.from([BigInt(16000)]), [1])

  for (let i = 0; i + WINDOW_SIZE_SAMPLES <= samples.length; i += WINDOW_SIZE_SAMPLES) {
    const chunk = samples.slice(i, i + WINDOW_SIZE_SAMPLES)
    const input = new ort.Tensor('float32', chunk, [1, WINDOW_SIZE_SAMPLES])

    try {
      const feeds: Record<string, any> = { input, h, c, sr }
      const results = await session.run(feeds)
      const prob = results.output.data[0]
      speechProbs.push(prob)
      h = results.hn
      c = results.cn
    } catch (err) {
      speechProbs.push(0)
    }
  }

  return probsToSegments(speechProbs, WINDOW_SIZE_SAMPLES / 16000)
}
