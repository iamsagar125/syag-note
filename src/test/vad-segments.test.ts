import { describe, it, expect } from "vitest";
import { probsToSegments } from "@/lib/vad-segments";

const frameDur = 0.032; // 512 samples at 16kHz

describe("probsToSegments", () => {
  it("returns empty for all-silence (probs below threshold)", () => {
    const probs = [0, 0, 0.1, 0.2, 0, 0];
    const out = probsToSegments(probs, frameDur);
    expect(out).toHaveLength(0);
  });

  it("returns one segment when speech probs exceed threshold for long enough", () => {
    const speechFrames = 10;
    const silenceFrames = 20;
    const probs = [...Array(speechFrames).fill(0.6), ...Array(silenceFrames).fill(0)];
    const out = probsToSegments(probs, frameDur);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0].start).toBeLessThan(out[0].end);
    expect(out[0].end - out[0].start).toBeGreaterThanOrEqual(0.25);
  });

  it("merges two close segments", () => {
    const gapFrames = Math.ceil(0.4 / frameDur);
    const probs = [
      ...Array(10).fill(0.5),
      ...Array(gapFrames).fill(0),
      ...Array(10).fill(0.5),
      ...Array(5).fill(0),
    ];
    const out = probsToSegments(probs, frameDur, { mergeGap: 0.5 });
    expect(out.length).toBeLessThanOrEqual(2);
  });

  it("respects minSpeechDuration", () => {
    const probs = [0.5, 0.5, 0, 0, 0];
    const out = probsToSegments(probs, frameDur, {
      minSpeechDuration: 1,
      minSilenceDuration: 0.25,
    });
    expect(out).toHaveLength(0);
  });

  it("extends segment boundaries by speechPadSec when provided", () => {
    const speechFrames = 10;
    const probs = [...Array(speechFrames).fill(0.6), ...Array(5).fill(0)];
    const withoutPad = probsToSegments(probs, frameDur, { speechPadSec: 0 });
    const withPad = probsToSegments(probs, frameDur, { speechPadSec: 0.125 });
    expect(withPad.length).toBeGreaterThanOrEqual(1);
    expect(withoutPad.length).toBeGreaterThanOrEqual(1);
    const totalDur = probs.length * frameDur;
    expect(withPad[0].start).toBe(Math.max(0, withoutPad[0].start - 0.125));
    expect(withPad[0].end).toBe(Math.min(totalDur, withoutPad[0].end + 0.125));
  });
});
