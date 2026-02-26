# STT Quality Improvement Plan

Map of the Whisper quality guide to Syag's codebase. Highest impact first.

## Current State Summary

| Component | Status |
|-----------|--------|
| VAD before Whisper | ✅ Silero ONNX in [capture.ts](electron/main/audio/capture.ts) — extracts speech before STT |
| Dual-stream (mic/system) | ✅ Channel 0 = Me, channel 1 = Them |
| condition_on_previous_text=False | ✅ `--no-context` in [stt-engine.ts](electron/main/models/stt-engine.ts) |
| initial_prompt | ✅ `--prompt` with vocabulary (comma-separated) |
| language=en | ✅ |
| beam_size=5 | ✅ |
| no_speech_threshold=0.6 | ✅ |
| Hallucination filter | ✅ In stt-engine + capture.ts |
| 16kHz mono | ✅ |

---

## Tier 1 — Highest Leverage

### 1. VAD Parameter Tuning

**Current** ([vad.ts](electron/main/audio/vad.ts)):
- `VAD_THRESHOLD = 0.5`
- `MIN_SPEECH_DURATION = 0.25` (250ms)
- `MIN_SILENCE_DURATION = 0.3` (300ms)

**Guide recommends (meetings)**:
- threshold 0.45 (catch quieter speakers)
- min_speech_duration_ms 200 (keep short "yes", "no")
- min_silence_duration_ms 500 (meetings have natural pauses)
- speech_pad_ms 250 (don't clip word edges)

**Changes**:
- [x] `vad.ts`: `VAD_THRESHOLD` 0.5 → 0.45
- [x] `vad.ts`: `MIN_SILENCE_DURATION` 0.3 → 0.5
- [ ] `vad.ts`: Add speech padding — Silero ONNX processes per-window; padding would need to be implemented in `probsToSegments` (extend segment boundaries by ~0.125s each side). Optional.

---

### 2. Initial Prompt as Natural Sentence

**Current** ([capture.ts](electron/main/audio/capture.ts) line 91, [stt-engine.ts](electron/main/models/stt-engine.ts) line 562):
- `customVocabulary = terms.join(', ')` → "JIRA, Kubernetes, Syag, TypeScript"

**Guide**: Format like a natural transcript. Longer prompts work better.
- "Syag AI meeting. Attendees: Sagar, Priya. Topics: JIRA, Kubernetes, TypeScript, sprint backlog, pull request."

**Changes**:
- [x] In `capture.ts`, build a structured prompt:
  ```ts
  function buildWhisperPrompt(meetingTitle?: string, vocabulary: string[]): string {
    const parts: string[] = []
    if (meetingTitle) parts.push(`${meetingTitle} meeting.`)
    if (vocabulary.length > 0) {
      parts.push(`Discussion about ${vocabulary.slice(0, 30).join(', ')}.`)
    }
    return parts.join(' ') || 'Meeting transcription.'
  }
  ```
- [ ] Pass to `processWithLocalSTT` and `routeSTT` (for cloud) as this sentence, not comma list.
- [ ] Max ~224 tokens (~150–200 words). Cap vocabulary accordingly.

---

### 3. whisper.cpp Decoding Params

**Current** ([stt-engine.ts](electron/main/models/stt-engine.ts) lines 544–557):
- `--entropy-thold` 2.8
- No `--logprob-thold`

**Guide**:
- `compression_ratio_threshold` 2.4 (filter repetitive)
- `logprob_threshold` -1.0 (filter low confidence)

**Changes**:
- [x] `--entropy-thold` 2.8 → 2.4
- [x] Add `--logprob-thold` -1.0 (whisper.cpp v1.8.3+)

---

### 4. MLX Whisper — condition_on_previous_text=False

**Current** ([stt-engine.ts](electron/main/models/stt-engine.ts) MLX_WORKER_SCRIPT):
- Uses `initial_prompt` when provided
- Does **not** set `condition_on_previous_text=False`

**Changes**:
- [x] Add `condition_on_previous_text=False` to mlx_whisper kwargs
- [ ] Use the same improved natural-sentence prompt from capture.ts

---

## Tier 2 — Significant Impact

### 5. Expand Hallucination Patterns

**Current** ([stt-engine.ts](electron/main/models/stt-engine.ts) HALLUCINATION_PATTERNS, [capture.ts](electron/main/audio/capture.ts) filterHallucinatedTranscript):

**Add from guide**:
- "see you in the next"
- "[music]", "[applause]", "[blank_audio]"
- Repetition detection: same 10+ char phrase repeated 3+ times

**Changes**:
- [x] Add patterns to `HALLUCINATION_PATTERNS` and `hallucinationPatterns`
- [ ] Add `deduplicateRepetitions`-style logic for phrase repetition (already have sentence-level in stt-engine)

---

### 6. Cloud STT — Vocabulary / Prompt

**Deepgram** ([deepgram.ts](electron/main/cloud/deepgram.ts)): Already uses `keywords` with vocabulary. ✅

**Groq** ([groq.ts](electron/main/cloud/groq.ts)): Sends only `language=en`. OpenAI Whisper API supports `prompt` for initial_prompt.

**Changes**:
- [x] Groq API supports `prompt` — added to `sttGroq`, passed from `routeSTT`.
- [x] OpenAI Whisper supports `prompt` — added to `sttOpenAI`.

---

### 7. Whisper.cpp Built-in VAD (Optional)

**Current**: Standalone Silero ONNX VAD in Node, then send speech-only audio to whisper.cpp.

**Alternative**: whisper.cpp v1.8.3 has built-in Silero VAD (`-vm ggml-silero-v6.2.0.bin --vad`). Could:
- Download Silero GGML model
- Pass `--vad` to whisper-cli
- Skip our ONNX VAD for local whisper path

**Tradeoff**: Removes ONNX dependency for VAD but we already have VAD working. Lower priority.

---

## Tier 3 — Future / Post-Meeting

### 8. LLM Post-Correction Pass

**Guide**: Use GPT-4o-mini / Haiku to fix remaining proper noun errors after transcription.

**Where**: After "Generate summary" or when user clicks "Re-enhance". Run transcript through a cheap LLM with vocabulary + correction prompt before summarization.

**Not in scope for initial pass** — add when you implement "reprocess transcript" or "enhance notes" flow.

---

### 9. v3 vs v3-Turbo Strategy

**Current**: User picks model. No automatic routing.

**Guide**: Use v3-turbo for real-time, v3 for post-meeting reprocess.

**Future**: Add "Re-transcribe with high accuracy" using v3 on saved audio (if stored). Low priority.

---

## Implementation Order

1. **VAD params** (vad.ts) — 5 min
2. **Initial prompt format** (capture.ts, stt-engine) — 15 min
3. **whisper.cpp entropy-thold** (stt-engine.ts) — 2 min
4. **MLX condition_on_previous_text=False** (stt-engine.ts) — 2 min
5. **Hallucination patterns** (stt-engine, capture) — 5 min
6. **Groq prompt** (groq.ts, router) — 10 min if API supports

---

## File Reference

| File | Role |
|------|------|
| [electron/main/audio/vad.ts](electron/main/audio/vad.ts) | Silero VAD params |
| [electron/main/audio/capture.ts](electron/main/audio/capture.ts) | Prompt building, vocabulary, VAD → STT flow |
| [electron/main/models/stt-engine.ts](electron/main/models/stt-engine.ts) | whisper.cpp args, MLX worker, hallucination filter |
| [electron/main/cloud/groq.ts](electron/main/cloud/groq.ts) | Groq STT (add prompt) |
| [electron/main/cloud/router.ts](electron/main/cloud/router.ts) | Passes vocabulary to routeSTT |
| [electron/main/cloud/deepgram.ts](electron/main/cloud/deepgram.ts) | Already has keywords |
