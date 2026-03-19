import { describe, it, expect } from "vitest";
import {
  accountNameAppearsInText,
  formatRecentTranscriptForMention,
  nameTokenFuzzyMatch,
  levenshtein,
} from "@/lib/account-context";

describe("accountNameAppearsInText", () => {
  it("matches case-insensitive whole word", () => {
    expect(accountNameAppearsInText("Sagar", "Yes, Sagar has his hand up.")).toBe(true);
    expect(accountNameAppearsInText("Sagar", "sagar please go ahead")).toBe(true);
  });

  it("matches common STT mishearings for 4+ letter names", () => {
    expect(accountNameAppearsInText("Sagar", "Yes, cigar has his hand raised.")).toBe(true);
    expect(accountNameAppearsInText("Sagar", "Saagar, go ahead please.")).toBe(true);
    expect(accountNameAppearsInText("Sagar", "Thanks, Saagar.")).toBe(true);
  });

  it("does not match substring", () => {
    expect(accountNameAppearsInText("Ann", "Planning session")).toBe(false);
  });

  it("does not fuzzy-match very short single-word names (avoid and/Ann)", () => {
    expect(accountNameAppearsInText("Ann", "We need to look at this and that.")).toBe(false);
  });

  it("matches multi-word name as phrase", () => {
    expect(accountNameAppearsInText("Mary Jane", "I think Mary Jane should comment.")).toBe(true);
    expect(accountNameAppearsInText("Mary Jane", "Mary Smith only")).toBe(false);
  });
});

describe("nameTokenFuzzyMatch", () => {
  it("allows STT-style edits for 5-letter names (incl. cigar ~ Sagar)", () => {
    expect(nameTokenFuzzyMatch("Sagar", "cigar")).toBe(true);
    expect(nameTokenFuzzyMatch("Sagar", "sagar")).toBe(true);
    expect(nameTokenFuzzyMatch("Sagar", "sagarr")).toBe(true);
  });

  it("rejects short name words for fuzzy", () => {
    expect(nameTokenFuzzyMatch("Ann", "and")).toBe(false);
  });
});

describe("levenshtein", () => {
  it("counts edits", () => {
    expect(levenshtein("sagar", "cigar")).toBe(2);
    expect(levenshtein("sagar", "sagar")).toBe(0);
  });
});

describe("formatRecentTranscriptForMention", () => {
  it("formats last lines with speaker tags", () => {
    const lines = [
      { speaker: "Others", time: "0:01", text: "Hi" },
      { speaker: "You", time: "0:02", text: "Hello" },
    ];
    expect(formatRecentTranscriptForMention(lines, 10)).toContain("[You] Hello");
    expect(formatRecentTranscriptForMention(lines, 10)).toContain("[Others] Hi");
  });
});
