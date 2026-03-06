/**
 * Convert VAD probability array to speech segments (merge, min duration).
 * Used by main process vad.ts; testable without ONNX.
 */

export interface VADSegment {
  start: number
  end: number
}

const VAD_THRESHOLD = 0.45
const MIN_SPEECH_DURATION = 0.25
const MIN_SILENCE_DURATION = 0.5
const MERGE_GAP_SEC = 0.5
/** Padding (seconds) to extend segment boundaries so word edges are not clipped. */
const SPEECH_PAD_SEC = 0.125

/**
 * Convert frame-level speech probabilities to [start, end] segments in seconds.
 */
export function probsToSegments(
  probs: number[],
  frameDuration: number,
  options?: {
    threshold?: number
    minSpeechDuration?: number
    minSilenceDuration?: number
    mergeGap?: number
    speechPadSec?: number
  }
): VADSegment[] {
  const threshold = options?.threshold ?? VAD_THRESHOLD
  const minSpeech = options?.minSpeechDuration ?? MIN_SPEECH_DURATION
  const minSilence = options?.minSilenceDuration ?? MIN_SILENCE_DURATION
  const mergeGap = options?.mergeGap ?? MERGE_GAP_SEC
  const speechPad = options?.speechPadSec ?? SPEECH_PAD_SEC
  const totalDuration = probs.length * frameDuration

  const segments: VADSegment[] = []
  let inSpeech = false
  let speechStart = 0
  let silenceStart = 0

  for (let i = 0; i < probs.length; i++) {
    const time = i * frameDuration

    if (probs[i] >= threshold) {
      if (!inSpeech) {
        speechStart = time
        inSpeech = true
      }
      silenceStart = time + frameDuration
    } else {
      if (inSpeech) {
        const silenceDuration = time - silenceStart
        if (silenceDuration >= minSilence) {
          const speechDuration = silenceStart - speechStart
          if (speechDuration >= minSpeech) {
            segments.push({ start: speechStart, end: silenceStart })
          }
          inSpeech = false
        }
      }
    }
  }

  if (inSpeech) {
    const endTime = probs.length * frameDuration
    if (endTime - speechStart >= minSpeech) {
      segments.push({ start: speechStart, end: endTime })
    }
  }

  const merged: VADSegment[] = []
  for (const seg of segments) {
    if (merged.length > 0 && seg.start - merged[merged.length - 1].end < mergeGap) {
      merged[merged.length - 1].end = seg.end
    } else {
      merged.push({ ...seg })
    }
  }

  if (speechPad > 0 && totalDuration > 0) {
    return merged.map((seg) => ({
      start: Math.max(0, seg.start - speechPad),
      end: Math.min(totalDuration, seg.end + speechPad),
    }))
  }
  return merged
}
