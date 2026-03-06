/**
 * Pure diarization clustering and segment merging.
 * Used by main process diarization.ts; testable with mocked embeddings.
 */

export interface EmbeddingSegment {
  embedding: Float32Array
  startTime: number
  endTime: number
}

export interface DiarizedSegment {
  speaker: string
  startTime: number
  endTime: number
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}

/**
 * Agglomerative clustering: returns cluster label (0, 1, ...) for each embedding index.
 */
export function clusterEmbeddings(
  embeddings: EmbeddingSegment[],
  threshold: number,
  maxClusters: number
): number[] {
  const n = embeddings.length
  if (n === 0) return []

  const simMatrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    simMatrix[i][i] = 1
    for (let j = i + 1; j < n; j++) {
      const sim = cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding)
      simMatrix[i][j] = sim
      simMatrix[j][i] = sim
    }
  }

  let clusters: number[][] = Array.from({ length: n }, (_, i) => [i])

  while (clusters.length > 1) {
    let bestSim = -Infinity
    let bestI = 0
    let bestJ = 1

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const sim = averageLinkage(clusters[i], clusters[j], simMatrix)
        if (sim > bestSim) {
          bestSim = sim
          bestI = i
          bestJ = j
        }
      }
    }

    if (bestSim < threshold && clusters.length <= maxClusters) break
    if (clusters.length <= 1) break

    const merged = [...clusters[bestI], ...clusters[bestJ]]
    const newClusters = clusters.filter((_, idx) => idx !== bestI && idx !== bestJ)
    newClusters.push(merged)
    clusters = newClusters
  }

  const labels = new Array(n).fill(0)
  for (let clusterIdx = 0; clusterIdx < clusters.length; clusterIdx++) {
    for (const pointIdx of clusters[clusterIdx]) {
      labels[pointIdx] = clusterIdx
    }
  }
  return labels
}

function averageLinkage(
  clusterA: number[],
  clusterB: number[],
  simMatrix: number[][]
): number {
  let totalSim = 0
  let count = 0
  for (const a of clusterA) {
    for (const b of clusterB) {
      totalSim += simMatrix[a][b]
      count++
    }
  }
  return count > 0 ? totalSim / count : 0
}

/**
 * Merge adjacent segments with the same speaker when gap < 1.0s.
 */
export function mergeAdjacentSegments(
  segments: DiarizedSegment[]
): DiarizedSegment[] {
  if (segments.length === 0) return []

  const merged: DiarizedSegment[] = [{ ...segments[0] }]

  for (let i = 1; i < segments.length; i++) {
    const last = merged[merged.length - 1]
    const curr = segments[i]

    if (curr.speaker === last.speaker && curr.startTime - last.endTime < 1.0) {
      last.endTime = curr.endTime
    } else {
      merged.push({ ...curr })
    }
  }

  return merged
}

/**
 * Build diarized segments from embeddings using clustering and merge.
 */
export function clusterEmbeddingsToSegments(
  embeddings: EmbeddingSegment[],
  threshold: number,
  maxClusters: number
): DiarizedSegment[] {
  if (embeddings.length === 0) return []
  if (embeddings.length === 1) {
    return [
      {
        speaker: "Speaker 1",
        startTime: embeddings[0].startTime,
        endTime: embeddings[0].endTime,
      },
    ]
  }

  const labels = clusterEmbeddings(embeddings, threshold, maxClusters)
  const segments: DiarizedSegment[] = embeddings.map((e, i) => ({
    speaker: `Speaker ${labels[i] + 1}`,
    startTime: e.startTime,
    endTime: e.endTime,
  }))
  return mergeAdjacentSegments(segments)
}
