import { processWithLocalSTT, resetContext, type STTResult } from '../models/stt-engine'
import { routeSTT } from '../cloud/router'
import { sttSystemDarwin } from './stt-system-darwin'
import { runVAD, ensureVADModel } from './vad'
import { diarize } from './diarization'
import { getSetting } from '../storage/database'
import { filterHallucinatedTranscript } from '@/lib/transcript-filter'
import { buildWhisperPrompt } from '@/lib/whisper-prompt'
import { resampleAudio } from './processor'

export type TranscriptWord = { word: string; start: number; end: number }
export type TranscriptCallback = (chunk: {
  speaker: string
  time: string
  text: string
  words?: TranscriptWord[]
}) => void
export type StatusCallback = (status: { state: string; error?: string }) => void

let isRecording = false
let isPaused = false
let transcriptCallback: TranscriptCallback | null = null
let statusCallback: StatusCallback | null = null

// Ring buffer per channel: last RING_DURATION_SEC of audio, never drained
const SAMPLE_RATE = 16000
const RING_DURATION_SEC = 15
const RING_SIZE = RING_DURATION_SEC * SAMPLE_RATE
const ringBuffers: Float32Array[] = [new Float32Array(RING_SIZE), new Float32Array(RING_SIZE)]
const ringWriteIndex: number[] = [0, 0]
/** Index up to which we've already sent audio to STT (per channel). */
const ringProcessedEndIndex: number[] = [0, 0]

let recordingStartTime = 0
let chunkTimer: ReturnType<typeof setInterval> | null = null
let silenceTimer: ReturnType<typeof setInterval> | null = null
let currentSTTModel = ''
let customVocabulary = ''
let isProcessing = false
let lastSpeechTime = 0
let autoPaused = false
let consecutiveSilentChunks = 0
let hasLoggedNoSTTModelThisSession = false
/** When true, do not run live STT during recording; run once on full buffer when recording stops. */
let deferTranscription = false
/** Sample rate of audio from renderer (may differ from 16kHz on some browsers). */
let captureSampleRate = 16000
/** Count of chunks dropped per channel when ring buffer overflows (STT too slow). */
let droppedChunksByChannel: number[] = [0, 0]
let hasNotifiedOverflow = false

// Near real-time: process every 2.5s when active, 15s when idle; 1s minimum buffer for faster first result
const CHUNK_INTERVAL_ACTIVE_MS = 2500
const CHUNK_INTERVAL_IDLE_MS = 15000
// Auto-pause on silence disabled — user manually pauses and uses "Generate summary" button
const MIN_SAMPLES_PER_CHANNEL = 16000 * 1 // 1s minimum for STT (faster first result; APIs support short audio)
// Diarization is channel-based: channel 0 = mic (You), channel 1 = system audio (Others).
// When you're muted, mic may still send silence/comfort noise; we use stricter gates for "You" to avoid false labels.
const SPEAKER_BY_CHANNEL = ['You', 'Others'] as const
// Slightly relaxed for channel 0 so quiet speech is not skipped (defer path).
const MIN_ENERGY_BY_CHANNEL = [0.0003, 0.0001] as const
const MIN_SPEECH_ENERGY_BY_CHANNEL = [0.001, 0.0004] as const
const MIN_SPEECH_DURATION_SEC_BY_CHANNEL = [0.8, 0.5] as const

export let currentChunkIntervalMs = CHUNK_INTERVAL_ACTIVE_MS

export function setChunkInterval(ms: number): void {
  currentChunkIntervalMs = ms
  restartChunkTimer()
}

/** Push samples into the ring buffer for a channel (overwrites oldest when full). */
function ringPush(channel: number, samples: Float32Array): void {
  const unprocessed = ringUnprocessedLength(channel)
  if (unprocessed + samples.length > RING_SIZE) {
    droppedChunksByChannel[channel]++
    if (!hasNotifiedOverflow) {
      hasNotifiedOverflow = true
      statusCallback?.({ state: 'stt-idle', error: 'Audio buffer overflow; some audio may be missing.' })
    }
  }
  const ring = ringBuffers[channel]
  let wi = ringWriteIndex[channel]
  for (let i = 0; i < samples.length; i++) {
    ring[wi] = samples[i]
    wi = (wi + 1) % RING_SIZE
  }
  ringWriteIndex[channel] = wi
}

/** Number of unprocessed samples (from processedEnd to writeIndex, wrapping). */
function ringUnprocessedLength(channel: number): number {
  const wi = ringWriteIndex[channel]
  const pe = ringProcessedEndIndex[channel]
  return (wi - pe + RING_SIZE) % RING_SIZE
}

/**
 * Copy unprocessed samples from ring into a linear Float32Array and advance processed index.
 * Returns null if unprocessed length is 0 or less than minLength.
 */
function ringTakeUnprocessed(channel: number, minLength: number): Float32Array | null {
  const n = ringUnprocessedLength(channel)
  if (n < minLength) return null
  const ring = ringBuffers[channel]
  const pe = ringProcessedEndIndex[channel]
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = ring[(pe + i) % RING_SIZE]
  }
  ringProcessedEndIndex[channel] = (pe + n) % RING_SIZE
  return out
}

/** Read last N seconds from ring (read-only, does not advance processed index). */
function ringReadRecent(channel: number, durationSec: number): Float32Array {
  const n = Math.min(Math.floor(durationSec * SAMPLE_RATE), RING_SIZE)
  if (n <= 0) return new Float32Array(0)
  const ring = ringBuffers[channel]
  const wi = ringWriteIndex[channel]
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = ring[(wi - n + i + RING_SIZE) % RING_SIZE]
  }
  return out
}

// ─── VAD-driven segmentation (silence / max-length closure + overlap) ─────────
const SEG_TICK_MS = 250
const SEG_WINDOW_READ_SEC = 10
const MIN_SEG_LEN_SEC = 2
/** Slightly lower for system audio (channel 1) so first transcript from e.g. YouTube appears sooner. */
const MIN_SEG_LEN_SEC_CH1 = 1.5
/** Max segment length (seconds); longer to avoid mid-sentence splits. Overridable via segment-max-length-sec setting. */
const DEFAULT_MAX_SEG_LEN_SEC = 10
const MAX_SEG_LEN_SEC = (() => {
  try {
    const v = getSetting('segment-max-length-sec')
    const n = v ? parseInt(v, 10) : NaN
    return !Number.isNaN(n) && n >= 5 && n <= 30 ? n : DEFAULT_MAX_SEG_LEN_SEC
  } catch {
    return DEFAULT_MAX_SEG_LEN_SEC
  }
})()
/** Silence duration (seconds) before closing segment. Overridable via segment-silence-threshold-sec setting. */
const DEFAULT_SILENCE_THRESHOLD_SEC = 0.7
const SILENCE_THRESHOLD_SEC = (() => {
  try {
    const v = getSetting('segment-silence-threshold-sec')
    const n = v ? parseFloat(v) : NaN
    return !Number.isNaN(n) && n >= 0.3 && n <= 2 ? n : DEFAULT_SILENCE_THRESHOLD_SEC
  } catch {
    return DEFAULT_SILENCE_THRESHOLD_SEC
  }
})()
const OVERLAP_SEC = 0.75
const OVERLAP_SAMPLES = Math.floor(OVERLAP_SEC * SAMPLE_RATE)

interface SegmentToTranscribe {
  id: number
  channel: number
  startTime: number
  endTime: number
  audioSamples: Float32Array
}

let segmentIdCounter = 0
const pendingSegments: SegmentToTranscribe[] = []
let segmentationTimer: ReturnType<typeof setInterval> | null = null

type SegmentState = {
  startTime: number
  chunks: Float32Array[]
  lastSpeechTime: number
}

const segmentState: SegmentState[] = [
  { startTime: 0, chunks: [], lastSpeechTime: 0 },
  { startTime: 0, chunks: [], lastSpeechTime: 0 },
]

let segmentationBusy = false

async function runSegmentationLoop(): Promise<void> {
  if (!isRecording || isPaused || deferTranscription || !transcriptCallback) return

  const nowSec = (Date.now() - recordingStartTime) / 1000
  const windowLenSec = SEG_WINDOW_READ_SEC
  const tailDurationSec = SEG_TICK_MS / 1000

  for (const channel of [0, 1]) {
    const window = ringReadRecent(channel, windowLenSec)
    if (window.length < SAMPLE_RATE * 0.5) continue

    let vadSegments: Array<{ start: number; end: number }> = []
    try {
      vadSegments = await runVAD(window, SAMPLE_RATE)
    } catch {
      continue
    }

    const windowLenSecActual = window.length / SAMPLE_RATE
    const tailStartSec = windowLenSecActual - tailDurationSec
    const speechInTail = vadSegments.some(
      (s) => s.end > tailStartSec && s.start < windowLenSecActual
    )

    const state = segmentState[channel]
    const totalSamples = state.chunks.reduce((sum, c) => sum + c.length, 0)
    const segmentDurationSec = totalSamples / SAMPLE_RATE

    if (speechInTail) {
      const tailSamples = Math.floor(tailDurationSec * SAMPLE_RATE)
      const tailStart = Math.max(0, window.length - tailSamples)
      state.chunks.push(window.subarray(tailStart, window.length).slice())
      state.lastSpeechTime = nowSec
    } else {
      const silenceDuration = nowSec - state.lastSpeechTime
      const minSegLen = channel === 1 ? MIN_SEG_LEN_SEC_CH1 : MIN_SEG_LEN_SEC
      const shouldClose =
        segmentDurationSec >= minSegLen &&
        (silenceDuration >= SILENCE_THRESHOLD_SEC || segmentDurationSec >= MAX_SEG_LEN_SEC)

      if (shouldClose && state.chunks.length > 0) {
        const full = new Float32Array(totalSamples)
        let off = 0
        for (const c of state.chunks) {
          full.set(c, off)
          off += c.length
        }
        const overlapLen = Math.min(OVERLAP_SAMPLES, Math.floor(full.length / 2))
        const segmentEndSec = nowSec - silenceDuration
        const segmentStartSec = segmentEndSec - segmentDurationSec

        pendingSegments.push({
          id: ++segmentIdCounter,
          channel,
          startTime: segmentStartSec,
          endTime: segmentEndSec,
          audioSamples: full,
        })

        state.startTime = segmentEndSec - OVERLAP_SEC
        state.chunks = [full.subarray(full.length - overlapLen).slice()]
        state.lastSpeechTime = nowSec
      }
    }
  }
}

/** Process one segment from the queue: STT then send { speaker, time, text }. */
async function processOneSegment(seg: SegmentToTranscribe): Promise<void> {
  if (!transcriptCallback) return
  const speaker = SPEAKER_BY_CHANNEL[seg.channel]
  const timeStr = formatTimestamp(seg.startTime)
  try {
    statusCallback?.({ state: 'stt-processing' })
    if (!currentSTTModel) return
    // Optional: noise gate before STT (same as processBufferedAudio)
    if (getSetting('audio-denoise-before-stt') === 'true') {
      const thresholdStr = getSetting('audio-denoise-threshold')
      const threshold = thresholdStr ? Math.max(0, Math.min(1, parseFloat(thresholdStr))) : 0.01
      if (!Number.isNaN(threshold)) {
        const samples = seg.audioSamples
        for (let i = 0; i < samples.length; i++) {
          if (Math.abs(samples[i]) < threshold) samples[i] = 0
        }
      }
    }
    const wavBuffer = pcmToWav(seg.audioSamples, SAMPLE_RATE)
    let sttResult: STTResult
    if (currentSTTModel.startsWith('local:')) {
      sttResult = await processWithLocalSTT(wavBuffer, currentSTTModel.replace('local:', ''), customVocabulary)
    } else if (currentSTTModel.startsWith('system:')) {
      const text = await sttSystemDarwin(wavBuffer)
      sttResult = { text, words: [] }
    } else {
      const vocab = sttVocabularyTerms.length > 0 ? sttVocabularyTerms : undefined
      const prompt = customVocabulary || undefined
      const text = await routeSTT(wavBuffer, currentSTTModel, vocab, prompt)
      sttResult = { text, words: [] }
    }
    const filtered = filterHallucinatedTranscript(sttResult.text)
    if (filtered) {
      const words: TranscriptWord[] | undefined = sttResult.words?.length
        ? sttResult.words.map((w) => ({
            word: w.word.trim(),
            start: w.start + seg.startTime,
            end: w.end + seg.startTime,
          })).filter((w) => w.word.length > 0)
        : undefined
      transcriptCallback({ speaker, time: timeStr, text: filtered, words })
    }
  } catch (err: any) {
    console.error('[capture] Segment STT error:', err)
    if (transcriptCallback)
      transcriptCallback({ speaker: 'System', time: timeStr, text: `[STT Error: ${err?.message ?? String(err)}]` })
  } finally {
    statusCallback?.({ state: 'stt-idle' })
  }
}

/** Close any open segment per channel and push to pendingSegments (for stop/flush). */
function flushOpenSegments(): void {
  const nowSec = (Date.now() - recordingStartTime) / 1000
  for (const channel of [0, 1]) {
    const state = segmentState[channel]
    if (state.chunks.length === 0) continue
    const totalSamples = state.chunks.reduce((sum, c) => sum + c.length, 0)
    if (totalSamples < SAMPLE_RATE * 0.5) continue
    const full = new Float32Array(totalSamples)
    let off = 0
    for (const c of state.chunks) {
      full.set(c, off)
      off += c.length
    }
    const segmentDurationSec = totalSamples / SAMPLE_RATE
    const segmentStartSec = nowSec - segmentDurationSec
    pendingSegments.push({
      id: ++segmentIdCounter,
      channel,
      startTime: segmentStartSec,
      endTime: nowSec,
      audioSamples: full,
    })
    state.chunks = []
  }
}

/** Drain pending segments one by one (async). */
async function drainQueue(): Promise<void> {
  while (pendingSegments.length > 0 && transcriptCallback) {
    const seg = pendingSegments.shift()!
    await processOneSegment(seg)
  }
}

function processQueue(): void {
  if (pendingSegments.length === 0 || isProcessing || !transcriptCallback) return
  isProcessing = true
  const seg = pendingSegments.shift()!
  processOneSegment(seg).finally(() => {
    isProcessing = false
    if (pendingSegments.length > 0) setImmediate(() => processQueue())
  })
}

function restartChunkTimer(): void {
  if (chunkTimer) clearInterval(chunkTimer)
  chunkTimer = null
  if (!isRecording || !deferTranscription) return
  chunkTimer = setInterval(() => {
    if (isPaused || isProcessing) return
    const hasData = ringUnprocessedLength(0) >= MIN_SAMPLES_PER_CHANNEL || ringUnprocessedLength(1) >= MIN_SAMPLES_PER_CHANNEL
    if (hasData) processBufferedAudio()
  }, currentChunkIntervalMs)
}

let meetingContextVocabulary: string[] = []
let meetingTitleForPrompt = ''
let sttVocabularyTerms: string[] = []

export async function startRecording(
  options: { sttModel: string; deviceId?: string; meetingTitle?: string; vocabulary?: string[]; sampleRate?: number },
  onTranscript: TranscriptCallback,
  onStatus?: StatusCallback
): Promise<boolean> {
  if (isRecording) return false

  captureSampleRate = options.sampleRate ?? 16000
  if (captureSampleRate !== 16000) {
    console.log('[capture] Renderer sample rate is', captureSampleRate, 'Hz; resampling to 16 kHz for STT.')
  }
  droppedChunksByChannel = [0, 0]
  hasNotifiedOverflow = false

  isRecording = true
  isPaused = false
  isProcessing = false
  autoPaused = false
  transcriptCallback = onTranscript
  statusCallback = onStatus || null
  ringWriteIndex[0] = 0
  ringWriteIndex[1] = 0
  ringProcessedEndIndex[0] = 0
  ringProcessedEndIndex[1] = 0
  recordingStartTime = Date.now()
  lastSpeechTime = Date.now()
  currentSTTModel = options.sttModel
  hasLoggedNoSTTModelThisSession = false
  deferTranscription = getSetting('transcribe-when-stopped') === 'true'
  resetContext()

  // Merge vocabulary: settings + meeting title tokens + explicit vocabulary
  meetingTitleForPrompt = options.meetingTitle?.trim() || ''
  const titleTerms = meetingTitleForPrompt
    ? meetingTitleForPrompt.split(/\s+/).filter(w => w.length > 2)
    : []
  meetingContextVocabulary = [
    ...(options.vocabulary || []),
    ...titleTerms,
  ]

  try {
    const fromSettings = getSetting('custom-vocabulary') || ''
    const terms = [
      ...(typeof fromSettings === 'string' ? fromSettings.split(/[,\n]+/).map(t => t.trim()).filter(Boolean) : []),
      ...meetingContextVocabulary,
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 100)
    sttVocabularyTerms = terms
    // Natural-sentence prompt for Whisper (Granola/Notion quality)
    customVocabulary = buildWhisperPrompt(meetingTitleForPrompt, terms)
  } catch {
    sttVocabularyTerms = meetingContextVocabulary
    customVocabulary = buildWhisperPrompt(meetingTitleForPrompt, meetingContextVocabulary)
  }

  if (currentSTTModel) {
    ensureVADModel().catch(err => console.warn('VAD model pre-load failed:', err.message))
  }

  consecutiveSilentChunks = 0
  currentChunkIntervalMs = CHUNK_INTERVAL_ACTIVE_MS
  segmentState[0] = { startTime: 0, chunks: [], lastSpeechTime: 0 }
  segmentState[1] = { startTime: 0, chunks: [], lastSpeechTime: 0 }
  pendingSegments.length = 0

  if (!deferTranscription) {
    segmentationTimer = setInterval(() => {
      if (segmentationBusy || isPaused) return
      segmentationBusy = true
      runSegmentationLoop()
        .then(() => processQueue())
        .finally(() => { segmentationBusy = false })
    }, SEG_TICK_MS)
  } else {
    chunkTimer = setInterval(() => {
      if (isPaused || isProcessing) return
      const hasData = ringUnprocessedLength(0) >= MIN_SAMPLES_PER_CHANNEL || ringUnprocessedLength(1) >= MIN_SAMPLES_PER_CHANNEL
      if (hasData) processBufferedAudio()
    }, currentChunkIntervalMs)
  }

  return true
}

export async function stopRecording(): Promise<{ duration: number } | null> {
  if (!isRecording) return null

  isRecording = false
  isPaused = false
  autoPaused = false

  if (chunkTimer) {
    clearInterval(chunkTimer)
    chunkTimer = null
  }
  if (segmentationTimer) {
    clearInterval(segmentationTimer)
    segmentationTimer = null
  }
  if (silenceTimer) {
    clearInterval(silenceTimer)
    silenceTimer = null
  }

  if (!deferTranscription && transcriptCallback) {
    flushOpenSegments()
    await drainQueue()
  }

  const hasData = ringUnprocessedLength(0) > 0 || ringUnprocessedLength(1) > 0
  if (deferTranscription && hasData && transcriptCallback) {
    statusCallback?.({ state: 'stt-processing' })
    await processBufferedAudio()
    statusCallback?.({ state: 'stt-idle' })
  } else if (hasData && !isProcessing) {
    processBufferedAudio()
  }

  transcriptCallback = null
  statusCallback = null
  const duration = Date.now() - recordingStartTime

  return { duration }
}

export function pauseRecording(): void {
  isPaused = true
}

export function resumeRecording(options?: { sttModel?: string }): void {
  isPaused = false
  autoPaused = false
  lastSpeechTime = Date.now()
  if (options?.sttModel != null && options.sttModel !== currentSTTModel) {
    currentSTTModel = options.sttModel
  }
}

export function processAudioChunk(pcmData: Float32Array, channel: number): boolean {
  if (!isRecording) return false

  const ch = channel === 1 ? 1 : 0
  if (autoPaused) {
    const energy = pcmData.reduce((sum, v) => sum + v * v, 0) / pcmData.length
    if (energy > 0.001) {
      autoPaused = false
      isPaused = false
      lastSpeechTime = Date.now()
      statusCallback?.({ state: 'auto-resumed' })
    } else {
      return false
    }
  }

  if (isPaused) return false

  let samples = pcmData
  if (captureSampleRate !== SAMPLE_RATE) {
    samples = resampleAudio(pcmData, captureSampleRate, SAMPLE_RATE)
  }
  ringPush(ch, samples)

  // When transcribe-when-stopped: schedule process as soon as we have enough (don't wait for timer).
  if (deferTranscription && !isProcessing && ringUnprocessedLength(ch) >= MIN_SAMPLES_PER_CHANNEL) {
    setImmediate(() => processBufferedAudio())
  }

  return true
}

async function processBufferedAudio(): Promise<void> {
  if (!transcriptCallback) return
  if (isProcessing) return

  for (const channel of [0, 1]) {
    const merged = ringTakeUnprocessed(channel, MIN_SAMPLES_PER_CHANNEL)
    if (!merged) continue

    const totalLength = merged.length
    isProcessing = true
    statusCallback?.({ state: 'stt-processing' })

    // Optional: noise gate before VAD (cuts samples below threshold to reduce background noise)
    if (getSetting('audio-denoise-before-stt') === 'true') {
      const thresholdStr = getSetting('audio-denoise-threshold')
      const threshold = thresholdStr ? Math.max(0, Math.min(1, parseFloat(thresholdStr))) : 0.01
      if (!Number.isNaN(threshold)) {
        for (let i = 0; i < merged.length; i++) {
          if (Math.abs(merged[i]) < threshold) merged[i] = 0
        }
      }
    }

    const elapsedSec = Math.floor((Date.now() - recordingStartTime) / 1000)
    const chunkStartSec = Math.max(0, elapsedSec - Math.floor(totalLength / SAMPLE_RATE))
    const speaker = SPEAKER_BY_CHANNEL[channel]

    try {
      if (!currentSTTModel) {
        if (!hasLoggedNoSTTModelThisSession) {
          hasLoggedNoSTTModelThisSession = true
          console.warn('[capture] No STT model configured; transcript will be empty. Set Speech-to-Text model in Settings > AI Models.')
        }
        isProcessing = false
        statusCallback?.({ state: 'stt-idle' })
        return
      }

      const energy = merged.reduce((sum, v) => sum + v * v, 0) / merged.length
      const minEnergy = MIN_ENERGY_BY_CHANNEL[channel]
      if (energy < minEnergy) {
        consecutiveSilentChunks++
        if (consecutiveSilentChunks >= 2 && currentChunkIntervalMs < CHUNK_INTERVAL_IDLE_MS) {
          currentChunkIntervalMs = CHUNK_INTERVAL_IDLE_MS
          restartChunkTimer()
        }
        isProcessing = false
        statusCallback?.({ state: 'stt-idle' })
        continue
      }

      let speechAudio = merged
      let hasSpeech = true
      try {
        const vadSegments = await runVAD(merged, SAMPLE_RATE)
        if (vadSegments.length === 0) {
          hasSpeech = false
          isProcessing = false
          statusCallback?.({ state: 'stt-idle' })
          continue
        }
        const totalSpeechDuration = vadSegments.reduce((sum, s) => sum + (s.end - s.start), 0)
        const minSpeechSec = MIN_SPEECH_DURATION_SEC_BY_CHANNEL[channel]
        if (totalSpeechDuration < minSpeechSec) {
          isProcessing = false
          statusCallback?.({ state: 'stt-idle' })
          continue
        }
        speechAudio = extractSpeechSegments(merged, vadSegments, SAMPLE_RATE)
      } catch (vadErr) {
        console.warn('VAD failed, processing full audio:', vadErr)
      }

      // Skip STT on near-silence to avoid hallucinations (stricter for "You" when muted)
      const speechEnergy = speechAudio.reduce((sum, v) => sum + v * v, 0) / speechAudio.length
      const minSpeechEnergy = MIN_SPEECH_ENERGY_BY_CHANNEL[channel]
      if (speechEnergy < minSpeechEnergy) {
        isProcessing = false
        statusCallback?.({ state: 'stt-idle' })
        continue
      }

      if (hasSpeech) {
        lastSpeechTime = Date.now()
        consecutiveSilentChunks = 0
        if (currentChunkIntervalMs > CHUNK_INTERVAL_ACTIVE_MS) {
          currentChunkIntervalMs = CHUNK_INTERVAL_ACTIVE_MS
          restartChunkTimer()
        }
      }

      const wavBuffer = pcmToWav(speechAudio, SAMPLE_RATE)
      let sttResult: STTResult
      if (currentSTTModel.startsWith('local:')) {
        sttResult = await processWithLocalSTT(wavBuffer, currentSTTModel.replace('local:', ''), customVocabulary)
      } else if (currentSTTModel.startsWith('system:')) {
        const text = await sttSystemDarwin(wavBuffer)
        sttResult = { text, words: [] }
      } else {
        // vocabulary: for Deepgram keywords; prompt: for Groq/OpenAI Whisper
        const vocab = sttVocabularyTerms.length > 0 ? sttVocabularyTerms : undefined
        const prompt = customVocabulary || undefined
        const text = await routeSTT(wavBuffer, currentSTTModel, vocab, prompt)
        sttResult = { text, words: [] }
      }

      const filtered = filterHallucinatedTranscript(sttResult.text)
      if (filtered) {
        lastSpeechTime = Date.now()
        const chunkDurationSec = totalLength / SAMPLE_RATE
        const useDiarization = getSetting('use-diarization') === 'true' && channel === 0
        if (useDiarization) {
          try {
            const diarSegments = await diarize(merged, SAMPLE_RATE)
            const distinctSpeakers = [...new Set(diarSegments.map((s) => s.speaker))]
            if (distinctSpeakers.length >= 2) {
              const sentences = filtered.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
              if (sentences.length > 0) {
                sentences.forEach((sent, i) => {
                  const relTime = (i / sentences.length) * chunkDurationSec
                  const seg = diarSegments.find((d) => d.startTime <= relTime && relTime <= d.endTime)
                  const label = seg?.speaker ?? distinctSpeakers[0]
                  transcriptCallback!({ speaker: label, time: formatTimestamp(chunkStartSec + (i / sentences.length) * chunkDurationSec), text: sent })
                })
              } else {
                transcriptCallback!({ speaker: distinctSpeakers[0], time: formatTimestamp(chunkStartSec), text: filtered })
              }
            } else {
              transcriptCallback!({ speaker: speaker, time: formatTimestamp(chunkStartSec), text: filtered })
            }
          } catch (diarErr) {
            console.warn('Diarization failed, using channel label:', diarErr)
            transcriptCallback!({ speaker, time: formatTimestamp(chunkStartSec), text: filtered })
          }
        } else {
          transcriptCallback!({ speaker, time: formatTimestamp(chunkStartSec), text: filtered })
        }
      }
    } catch (err: any) {
      console.error('STT processing error:', err)
      if (transcriptCallback) {
        const msg = err?.message || String(err)
        let hint = ''
        if (currentSTTModel.startsWith('local:')) {
          const isMLX = currentSTTModel.includes('mlx')
          const isTheStage = currentSTTModel.includes('thestage')
          if (/ffmpeg|Errno 2.*file or directory/i.test(msg)) {
            hint = ' Install ffmpeg (e.g. brew install ffmpeg) and ensure it is in your PATH. MLX Whisper needs it to read audio.'
          } else if (isTheStage) {
            hint = ' For TheStage Whisper: install from Settings > AI Models (Download); macOS only. Requires Python 3 and thestage-speechkit.'
          } else if (isMLX || msg.includes('MLX') || msg.includes('mlx')) {
            hint = ' For MLX: ensure Python 3 and mlx-whisper are installed (pip3 install mlx-whisper); first run may take several minutes. To use another STT, select it in Settings > AI Models and start or resume recording.'
          } else {
            hint = ' For whisper.cpp: ensure the model is downloaded and whisper-cli is available in Settings > AI Models.'
          }
        } else if (currentSTTModel.startsWith('system:')) {
          hint = ' Grant Speech Recognition in System Settings > Privacy & Security, or try another STT model.'
        } else if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('no api key')) {
          hint = ' Add your API key in Settings > AI Models and connect the provider.'
        } else if (/certificate|issuer certificate|SSL|TLS|ECONNREFUSED|ETIMEDOUT|network/i.test(msg)) {
          hint = ' If you\'re on a corporate network or VPN, try another network or check proxy/certificate settings.'
        }
        transcriptCallback({
          speaker: 'System',
          time: formatTimestamp(elapsedSec),
          text: `[STT Error: ${msg}${hint}]`,
        })
        statusCallback?.({ state: 'stt-idle', error: msg })
      }
    }
    isProcessing = false
    statusCallback?.({ state: 'stt-idle' })
  }

  // Low-latency: if either channel still has enough samples, process again immediately
  const hasMore0 = ringUnprocessedLength(0) >= MIN_SAMPLES_PER_CHANNEL
  const hasMore1 = ringUnprocessedLength(1) >= MIN_SAMPLES_PER_CHANNEL
  if ((hasMore0 || hasMore1) && transcriptCallback) {
    setImmediate(() => processBufferedAudio())
  }
}

function extractSpeechSegments(
  audio: Float32Array,
  segments: Array<{ start: number; end: number }>,
  sampleRate: number
): Float32Array {
  let totalSamples = 0
  for (const seg of segments) {
    const startSample = Math.floor(seg.start * sampleRate)
    const endSample = Math.min(Math.ceil(seg.end * sampleRate), audio.length)
    totalSamples += endSample - startSample
  }

  const result = new Float32Array(totalSamples)
  let writeOffset = 0
  for (const seg of segments) {
    const startSample = Math.floor(seg.start * sampleRate)
    const endSample = Math.min(Math.ceil(seg.end * sampleRate), audio.length)
    result.set(audio.subarray(startSample, endSample), writeOffset)
    writeOffset += endSample - startSample
  }
  return result
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function pcmToWav(pcm: Float32Array, sampleRate: number): Buffer {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcm.length * (bitsPerSample / 8)
  const headerSize = 44

  const buffer = Buffer.alloc(headerSize + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < pcm.length; i++) {
    const sample = Math.max(-1, Math.min(1, pcm[i]))
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    buffer.writeInt16LE(Math.round(int16), headerSize + i * 2)
  }

  return buffer
}
