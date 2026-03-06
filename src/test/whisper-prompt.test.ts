import { describe, it, expect } from "vitest";
import {
  buildWhisperPrompt,
  WHISPER_PROMPT_MAX_CHARS,
} from "@/lib/whisper-prompt";

describe("buildWhisperPrompt", () => {
  it("includes title and vocabulary in natural sentence", () => {
    const out = buildWhisperPrompt("Q1 Roadmap", ["API", "launch"]);
    expect(out).toContain("Q1 Roadmap meeting.");
    expect(out).toContain("Discussion about");
    expect(out).toContain("API");
    expect(out).toContain("launch");
  });

  it("uses default when empty title and vocab", () => {
    const out = buildWhisperPrompt("", []);
    expect(out).toBe("Meeting transcription.");
  });

  it("trims title and uses only first 35 terms", () => {
    const terms = Array.from({ length: 50 }, (_, i) => `term${i}`);
    const out = buildWhisperPrompt("  Standup  ", terms);
    expect(out).toContain("Standup meeting.");
    expect(out).toContain("term0");
    expect(out).not.toContain("term35");
  });

  it("caps at maxChars when provided", () => {
    const long = "a".repeat(500);
    const out = buildWhisperPrompt(long, ["x"], 100);
    expect(out.length).toBeLessThanOrEqual(100);
  });

  it("respects WHISPER_PROMPT_MAX_CHARS when not over", () => {
    const out = buildWhisperPrompt("Short", ["A", "B"]);
    expect(out.length).toBeLessThanOrEqual(WHISPER_PROMPT_MAX_CHARS);
  });
});
