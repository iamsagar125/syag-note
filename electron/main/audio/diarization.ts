import { extractEmbeddings, ensureEmbeddingModel } from './speaker-embeddings'
import { ensureVADModel } from './vad'
import { clusterEmbeddingsToSegments } from '@/lib/diarization-cluster'

export type { DiarizedSegment } from '@/lib/diarization-cluster'

const SIMILARITY_THRESHOLD = 0.65
const MAX_SPEAKERS = 6

export async function ensureDiarizationModels(): Promise<void> {
  await Promise.all([
    ensureVADModel(),
    ensureEmbeddingModel(),
  ])
}

export async function diarize(
  audio: Float32Array,
  sampleRate: number
): Promise<import('@/lib/diarization-cluster').DiarizedSegment[]> {
  const embeddings = await extractEmbeddings(audio, sampleRate)

  if (embeddings.length === 0) {
    return [{
      speaker: 'Speaker 1',
      startTime: 0,
      endTime: audio.length / sampleRate,
    }]
  }

  if (embeddings.length === 1) {
    return [{
      speaker: 'Speaker 1',
      startTime: embeddings[0].startTime,
      endTime: embeddings[0].endTime,
    }]
  }

  return clusterEmbeddingsToSegments(embeddings, SIMILARITY_THRESHOLD, MAX_SPEAKERS)
}
