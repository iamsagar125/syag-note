import { describe, it, expect } from "vitest";
import { parseSTTModel } from "@/lib/stt-model";

describe("parseSTTModel", () => {
  it("parses providerId and modelName", () => {
    expect(parseSTTModel("deepgram:Nova-2")).toEqual({
      providerId: "deepgram",
      modelName: "Nova-2",
    });
    expect(parseSTTModel("groq:whisper-large-v3")).toEqual({
      providerId: "groq",
      modelName: "whisper-large-v3",
    });
  });

  it("handles model name with colons", () => {
    expect(parseSTTModel("openai:gpt-4:turbo")).toEqual({
      providerId: "openai",
      modelName: "gpt-4:turbo",
    });
  });

  it("returns null for empty or whitespace", () => {
    expect(parseSTTModel("")).toBeNull();
    expect(parseSTTModel("   ")).toBeNull();
  });

  it("returns null when providerId is missing", () => {
    expect(parseSTTModel(":Nova-2")).toBeNull();
  });

  it("trims providerId and keeps modelName", () => {
    expect(parseSTTModel("  deepgram :Nova-2")).toEqual({
      providerId: "deepgram",
      modelName: "Nova-2",
    });
  });
});
