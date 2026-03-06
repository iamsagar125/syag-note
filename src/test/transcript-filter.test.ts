import { describe, it, expect } from "vitest";
import {
  collapseRepetitions,
  normalizeSentenceCasing,
  filterHallucinatedTranscript,
} from "@/lib/transcript-filter";

describe("collapseRepetitions", () => {
  it("collapses consecutive duplicate words", () => {
    expect(collapseRepetitions("that that that")).toBe("that");
    expect(collapseRepetitions("where where")).toBe("where");
    expect(collapseRepetitions("It's it's it's")).toBe("It's");
    expect(collapseRepetitions("What what what what")).toBe("What");
  });

  it("collapses duplicate consecutive sentences (keeps first)", () => {
    const out = collapseRepetitions("Hello world. Hello world. Hello world.");
    expect(out).toBe("Hello world.");
  });

  it("collapses 10+ char phrase repeated 3+ times", () => {
    const out = collapseRepetitions(
      "we need to ship we need to ship we need to ship"
    );
    expect(out).toContain("we need to ship");
    expect(out.split("we need to ship").length).toBe(2); // one occurrence kept
  });

  it("preserves valid content without repetition", () => {
    expect(collapseRepetitions("Ship by Friday. Thanks.")).toBe(
      "Ship by Friday. Thanks."
    );
  });
});

describe("normalizeSentenceCasing", () => {
  it("capitalizes first letter of each sentence", () => {
    expect(normalizeSentenceCasing("hello. world.")).toBe("Hello. World.");
  });

  it('replaces " i " with " I "', () => {
    expect(normalizeSentenceCasing("and i said so")).toBe("And I said so"); // first letter + " i " → " I "
    const withI = normalizeSentenceCasing("So i think i will go.");
    expect(withI).toContain(" I ");
  });
});

describe("filterHallucinatedTranscript", () => {
  it("returns null for thanks for watching", () => {
    expect(filterHallucinatedTranscript("Thank you for watching")).toBeNull();
    expect(filterHallucinatedTranscript("Thanks for watching")).toBeNull();
  });

  it("returns null for subscribe-style hallucinations", () => {
    expect(filterHallucinatedTranscript("Subscribe to our channel")).toBeNull();
    expect(filterHallucinatedTranscript("Like and subscribe")).toBeNull();
    expect(
      filterHallucinatedTranscript("Don't forget to subscribe")
    ).toBeNull();
  });

  it("returns null for [music] / [applause] type segments", () => {
    expect(filterHallucinatedTranscript("[music]")).toBeNull();
    expect(filterHallucinatedTranscript("[applause]")).toBeNull();
    expect(filterHallucinatedTranscript("(laughter)")).toBeNull();
  });

  it("returns filtered and cased text for valid meeting content", () => {
    const out = filterHallucinatedTranscript(
      "we need to ship by friday. i will follow up."
    );
    expect(out).not.toBeNull();
    expect(out).toContain("friday"); // sentence casing only caps first letter of segment, not every word
    expect(out).toContain(" I "); // " i " normalized to " I "
  });

  it("collapses word repetition before filtering", () => {
    const out = filterHallucinatedTranscript("that that that is correct.");
    expect(out).toBe("That is correct.");
  });

  it("returns null for segment that is only short phrase repeated 3+ times", () => {
    const repeated = "go now go now go now";
    expect(filterHallucinatedTranscript(repeated)).toBeNull();
  });

  it("returns null for segment with many repeated-letter words (STT garbage)", () => {
    expect(filterHallucinatedTranscript("MMM and MMMBerber something")).toBeNull();
    expect(filterHallucinatedTranscript("One MMM two BBB three CCC here")).toBeNull();
  });

  it("keeps segment with one repeated-letter word among normal text", () => {
    const out = filterHallucinatedTranscript("We need to address the issue.");
    expect(out).not.toBeNull();
    expect(out).toContain("address");
  });

  it("keeps valid content that mentions next episode (not an outro)", () => {
    const out = filterHallucinatedTranscript("I'm going to go to the next episode.");
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toContain("next episode");
    const out2 = filterHallucinatedTranscript("Next episode we'll cover authentication.");
    expect(out2).not.toBeNull();
    expect(out2!.toLowerCase()).toContain("next episode");
  });

  it("drops clear YouTube-style outros when segment is only that phrase", () => {
    expect(filterHallucinatedTranscript("Thanks for watching")).toBeNull();
    expect(filterHallucinatedTranscript("See you in the next video")).toBeNull();
    expect(filterHallucinatedTranscript("See you in the next episode")).toBeNull();
  });

  it("keeps mixed content that contains outro-like wording", () => {
    const out = filterHallucinatedTranscript("Thank you. I'm going to go to the next episode with more details.");
    expect(out).not.toBeNull();
    expect(out!.toLowerCase()).toContain("next episode");
  });
});
