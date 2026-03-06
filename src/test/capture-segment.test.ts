/**
 * Tests segment boundary logic (mirrors capture.ts constants and closure condition).
 * Ensures a single 5–8 s phrase is not split mid-sentence (max segment >= 10 s).
 */

import { describe, it, expect } from 'vitest'

const MIN_SEG_LEN_SEC = 2
const MIN_SEG_LEN_SEC_CH1 = 1.5
const MAX_SEG_LEN_SEC = 10
const SILENCE_THRESHOLD_SEC = 0.7

function wouldCloseSegment(
  segmentDurationSec: number,
  silenceDurationSec: number,
  channel: 0 | 1
): boolean {
  const minSegLen = channel === 1 ? MIN_SEG_LEN_SEC_CH1 : MIN_SEG_LEN_SEC
  return (
    segmentDurationSec >= minSegLen &&
    (silenceDurationSec >= SILENCE_THRESHOLD_SEC || segmentDurationSec >= MAX_SEG_LEN_SEC)
  )
}

describe('segment boundary logic', () => {
  it('does not close before min segment length', () => {
    expect(wouldCloseSegment(1, 1, 0)).toBe(false)
    expect(wouldCloseSegment(1.4, 0.8, 1)).toBe(false)
  })

  it('closes after silence threshold when segment is long enough', () => {
    expect(wouldCloseSegment(2, 0.7, 0)).toBe(true)
    expect(wouldCloseSegment(2, 0.5, 0)).toBe(false)
    expect(wouldCloseSegment(3, 0.8, 0)).toBe(true)
  })

  it('closes at max segment length even with no silence (avoids unbounded growth)', () => {
    expect(wouldCloseSegment(10, 0, 0)).toBe(true)
  })

  it('does not close a 5–8 s phrase mid-sentence (max 10 s allows single phrase)', () => {
    expect(wouldCloseSegment(5, 0, 0)).toBe(false)
    expect(wouldCloseSegment(6, 0, 0)).toBe(false)
    expect(wouldCloseSegment(7, 0, 0)).toBe(false)
    expect(wouldCloseSegment(8, 0, 0)).toBe(false)
    expect(wouldCloseSegment(9, 0, 0)).toBe(false)
    expect(wouldCloseSegment(10, 0, 0)).toBe(true)
  })

  it('channel 1 (system audio) uses lower min length', () => {
    expect(wouldCloseSegment(1.5, 0.8, 1)).toBe(true)
    expect(wouldCloseSegment(1.4, 0.8, 1)).toBe(false)
  })
})
