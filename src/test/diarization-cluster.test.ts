import { describe, it, expect } from "vitest";
import {
  clusterEmbeddings,
  mergeAdjacentSegments,
  clusterEmbeddingsToSegments,
  type EmbeddingSegment,
  type DiarizedSegment,
} from "@/lib/diarization-cluster";

/** Create a constant embedding vector for testing (same vec = same speaker). */
function vec(...values: number[]): Float32Array {
  return new Float32Array(values);
}

describe("clusterEmbeddings", () => {
  it("assigns same label to similar embeddings (two clusters)", () => {
    // Cluster 0: indices 0,1,2 with identical embedding; Cluster 1: index 3 with different
    const same = vec(1, 0, 0)
    const other = vec(0, 1, 0)
    const embeddings: EmbeddingSegment[] = [
      { embedding: same, startTime: 0, endTime: 1 },
      { embedding: same, startTime: 1, endTime: 2 },
      { embedding: same, startTime: 2, endTime: 3 },
      { embedding: other, startTime: 3, endTime: 4 },
    ]
    const labels = clusterEmbeddings(embeddings, 0.65, 6)
    expect(labels[0]).toBe(labels[1])
    expect(labels[1]).toBe(labels[2])
    expect(labels[2]).not.toBe(labels[3])
  })
})

describe("mergeAdjacentSegments", () => {
  it("merges adjacent same-speaker segments when gap < 1s", () => {
    const segments: DiarizedSegment[] = [
      { speaker: "Speaker 1", startTime: 0, endTime: 1 },
      { speaker: "Speaker 1", startTime: 1.2, endTime: 2 }, // gap 0.2
      { speaker: "Speaker 2", startTime: 3, endTime: 4 },
    ]
    const merged = mergeAdjacentSegments(segments)
    expect(merged).toHaveLength(2)
    expect(merged[0].speaker).toBe("Speaker 1")
    expect(merged[0].endTime).toBe(2)
    expect(merged[1].speaker).toBe("Speaker 2")
  })

  it("does not merge when gap >= 1s", () => {
    const segments: DiarizedSegment[] = [
      { speaker: "Speaker 1", startTime: 0, endTime: 1 },
      { speaker: "Speaker 1", startTime: 2.5, endTime: 3 },
    ]
    const merged = mergeAdjacentSegments(segments)
    expect(merged).toHaveLength(2)
  })
})

describe("clusterEmbeddingsToSegments", () => {
  it("returns single segment for one embedding", () => {
    const embeddings: EmbeddingSegment[] = [
      { embedding: vec(1, 0), startTime: 0, endTime: 1.5 },
    ]
    const out = clusterEmbeddingsToSegments(embeddings, 0.65, 6)
    expect(out).toHaveLength(1)
    expect(out[0].speaker).toBe("Speaker 1")
    expect(out[0].startTime).toBe(0)
    expect(out[0].endTime).toBe(1.5)
  })

  it("produces Speaker 1 and Speaker 2 for two clusters and merges adjacent", () => {
    const same = vec(1, 0, 0)
    const other = vec(0, 1, 0)
    const embeddings: EmbeddingSegment[] = [
      { embedding: same, startTime: 0, endTime: 1 },
      { embedding: same, startTime: 1.1, endTime: 2 },
      { embedding: other, startTime: 2.5, endTime: 3 },
    ]
    const out = clusterEmbeddingsToSegments(embeddings, 0.65, 6)
    const speakers = [...new Set(out.map((s) => s.speaker))]
    expect(speakers).toContain("Speaker 1")
    expect(speakers).toContain("Speaker 2")
    expect(out.length).toBeGreaterThanOrEqual(2)
  })
})
