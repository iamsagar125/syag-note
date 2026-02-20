import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync, unlinkSync, readdirSync, statSync } from 'fs'
import { createWriteStream } from 'fs'
import https from 'https'
import http from 'http'

const MODEL_URLS: Record<string, { url: string; filename: string }> = {
  'whisper-large-v3-turbo': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    filename: 'ggml-large-v3-turbo.bin',
  },
  'whisper-large-v3': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin',
    filename: 'ggml-large-v3.bin',
  },
  'whisper-medium': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
    filename: 'ggml-medium.bin',
  },
  'whisper-small': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    filename: 'ggml-small.bin',
  },
  'whisper-tiny': {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    filename: 'ggml-tiny.bin',
  },
  'silero-vad': {
    url: 'https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.onnx',
    filename: 'silero_vad.onnx',
  },
  'ecapa-tdnn': {
    url: 'https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb/resolve/main/embedding_model.onnx',
    filename: 'ecapa_tdnn.onnx',
  },
  'llama-3.2-3b': {
    url: 'https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf',
    filename: 'llama-3.2-3b-instruct-q4_k_m.gguf',
  },
  'phi-3-mini': {
    url: 'https://huggingface.co/bartowski/Phi-3.1-mini-4k-instruct-GGUF/resolve/main/Phi-3.1-mini-4k-instruct-Q4_K_M.gguf',
    filename: 'phi-3-mini-q4_k_m.gguf',
  },
  'gemma-2-2b': {
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    filename: 'gemma-2-2b-it-q4_k_m.gguf',
  },
}

const activeDownloads = new Map<string, { abort: () => void }>()

export function getModelsDir(): string {
  const dir = join(app.getPath('home'), '.syag', 'models')
  return dir
}

export function ensureModelsDir(): void {
  mkdirSync(getModelsDir(), { recursive: true })
}

export function getModelPath(modelId: string): string | null {
  const info = MODEL_URLS[modelId]
  if (!info) return null
  const path = join(getModelsDir(), info.filename)
  return existsSync(path) ? path : null
}

export function listDownloadedModels(): string[] {
  const modelsDir = getModelsDir()
  if (!existsSync(modelsDir)) return []

  const downloaded: string[] = []
  for (const [modelId, info] of Object.entries(MODEL_URLS)) {
    const path = join(modelsDir, info.filename)
    if (existsSync(path)) {
      const stat = statSync(path)
      if (stat.size > 1000) {
        downloaded.push(modelId)
      }
    }
  }
  return downloaded
}

type ProgressCallback = (progress: {
  modelId: string
  bytesDownloaded: number
  totalBytes: number
  percent: number
}) => void

export function downloadModel(modelId: string, onProgress: ProgressCallback): Promise<void> {
  return new Promise((resolve, reject) => {
    const info = MODEL_URLS[modelId]
    if (!info) {
      reject(new Error(`Unknown model: ${modelId}`))
      return
    }

    ensureModelsDir()
    const destPath = join(getModelsDir(), info.filename)
    const tempPath = destPath + '.tmp'

    const makeRequest = (url: string, redirectCount = 0): void => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'))
        return
      }

      const client = url.startsWith('https') ? https : http
      const req = client.get(url, { headers: { 'User-Agent': 'Syag/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          makeRequest(res.headers.location, redirectCount + 1)
          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} downloading ${modelId}`))
          return
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
        let bytesDownloaded = 0
        const file = createWriteStream(tempPath)

        res.on('data', (chunk: Buffer) => {
          bytesDownloaded += chunk.length
          onProgress({
            modelId,
            bytesDownloaded,
            totalBytes,
            percent: totalBytes > 0 ? Math.round((bytesDownloaded / totalBytes) * 100) : 0,
          })
        })

        res.pipe(file)

        file.on('finish', () => {
          file.close(() => {
            try {
              const { renameSync } = require('fs')
              renameSync(tempPath, destPath)
              activeDownloads.delete(modelId)
              resolve()
            } catch (err) {
              activeDownloads.delete(modelId)
              reject(err)
            }
          })
        })

        file.on('error', (err) => {
          file.close()
          try { unlinkSync(tempPath) } catch {}
          activeDownloads.delete(modelId)
          reject(err)
        })
      })

      req.on('error', (err) => {
        try { unlinkSync(tempPath) } catch {}
        activeDownloads.delete(modelId)
        reject(err)
      })

      activeDownloads.set(modelId, {
        abort: () => {
          req.destroy()
          try { unlinkSync(tempPath) } catch {}
          activeDownloads.delete(modelId)
          reject(new Error('Download cancelled'))
        }
      })
    }

    makeRequest(info.url)
  })
}

export function cancelDownload(modelId: string): void {
  const download = activeDownloads.get(modelId)
  if (download) download.abort()
}

export function deleteModel(modelId: string): void {
  const info = MODEL_URLS[modelId]
  if (!info) return
  const path = join(getModelsDir(), info.filename)
  try { unlinkSync(path) } catch {}
}
