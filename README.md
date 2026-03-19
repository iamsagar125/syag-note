# Syag

A private, on-device meeting companion for macOS. Syag records your meetings, transcribes them in real time, generates structured summaries, and coaches you to communicate better — all without your data leaving your machine.

---

## What Syag does

**Record & transcribe** — Capture mic and system audio simultaneously with live speaker-labeled transcription ("You" vs "Others"). Works with Zoom, Google Meet, Teams, or any audio source.

**AI summaries** — After a meeting, get a structured summary: overview, key points, action items with assignees and due dates, decisions, and open questions. Customize the output with your own prompt templates.

**Knowledge base suggestions** — Point Syag at a folder of your notes. During a live call, it searches your knowledge base and surfaces relevant talking points in real time.

**Role-aware coaching** — Post-meeting coaching tuned to your role (PM, Engineer, Sales, Founder, Designer, etc.) with a communication mix breakdown and LLM-generated insights drawn from frameworks by top thought leaders.

**People & relationships** — Syag automatically extracts the people you meet with. View, edit, merge duplicates, and track your meeting history with each person.

**Calendar integration** — Connect Google Calendar or Microsoft 365 to see upcoming meetings and auto-detect when a call starts.

**Agent API** — A read-only Unix socket API for AI agents and tools to query your notes programmatically. Local-only, token-authenticated, zero network exposure.

**Hidden from screen share** — A single toggle hides Syag from screen sharing so other participants never see it.

---

## Privacy

- All data stored locally in `~/Library/Application Support/Syag/`
- API keys encrypted via macOS Keychain (Electron safeStorage)
- No telemetry, no analytics, no cloud sync
- Supports fully local transcription (MLX Whisper / whisper.cpp) and local LLMs
- Cloud providers (OpenAI, Anthropic, Groq, Deepgram, etc.) are opt-in — bring your own keys

---

## Install

Download the latest DMG from the [Releases](https://github.com/iamsagar125/syag-note/releases) page, open it, and drag Syag to Applications.

macOS (Apple Silicon) only.

**If macOS blocks the app** (e.g. "cannot be opened because it is from an unidentified developer"): the DMG is not notarized. Use either (one-time per install):

- **Right-click** Syag in Applications → **Open** → confirm **Open** in the dialog; or  
- In Terminal: `xattr -cr /Applications/Syag.app` then open Syag as usual.

**To avoid the prompt entirely** (for your own builds): use an Apple Developer ID and notarize. In `electron-builder.yml` set `mac.identity` to your Developer ID Application certificate name (remove `identity: null`). For notarization, set env vars `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`, then run the same package command; electron-builder will notarize when credentials are present.

---

## Resources

Internal reference (screenshots, assets):  
https://drive.google.com/drive/folders/1BdYUTPUSLokM7wYnkgE2Wqn46IX9TsyS?usp=sharing

### Architecture reference (source layout)

| Layer | Path | Role |
|-------|------|------|
| **Entry** | `main.tsx` | React root, mounts `App` |
| **App** | `App.tsx` | Providers (Model, Folder, Notes, Recording, Calendar, SidebarVisibility), Router, GlobalRecordingBanner, MeetingDetectionHandler, SearchCommand, TrayNavigationHandler |
| **Routes** | `App.tsx` | `/` Index, `/notes` AllNotes, `/new-note` NewNotePage, `/note/:id` NoteDetailPage, `/calendar` CalendarPage, `/coaching` CoachingPage, `/settings` SettingsPage, `/ask` AskSyag, `/onboarding` OnboardingPage, `/tray-preview` TrayMenu, `*` NotFound |
| **Contexts** | `contexts/*.tsx` | **RecordingContext**: session, transcript, start/stop/pause/resume capture, Web Speech fallback. **NotesContext**: CRUD notes. **FolderContext**: folders. **ModelSettingsContext**: AI/STT models, download states, keychain. **CalendarContext**: events, ICS. **SidebarVisibilityContext**: sidebar state. |
| **Pages** | `pages/*.tsx` | NewNotePage (record, live transcript, summary), NoteDetailPage (view/edit, Ask bar), SettingsPage (Account, Preferences, AI Models, Transcription, Templates, Calendar, Notifications, Integrations, About), CalendarPage, CoachingPage, AskSyag, OnboardingPage |
| **Components** | `components/*.tsx` | GlobalRecordingBanner, TrayMenu, AskBar, EditableSummary, Sidebar, MeetingCard, ICSDialog, Jira/Slack/Teams connect dialogs, ErrorBoundary, SearchCommand, UI primitives (`components/ui/`) |
| **API bridge** | `lib/electron-api.ts` | Typed `window.electronAPI` (or undefined in web) |

---

### 2. Electron main process (electron/main/)

| Module | File | Role |
|--------|------|------|
| **Entry** | `index.ts` | `app.setName('Syag')`, protocol, DB init, models dir, IPC, window, tray, meeting detection, power monitor. `before-quit`: stop meeting detection. |
| **IPC** | `ipc-handlers.ts` | **db**: notes, folders, settings. **models**: download, cancel, delete, list, MLX check/install. **recording**: start, stop, pause, resume, audio-chunk. **llm**: summarize, chat. **keychain**: get/set/delete. **app**: version, login item, tray navigate/start/pause. **permissions**: mic, screen. **meeting**: set calendar events. **tray**: update state. **export**: docx, pdf, markdown. **integrations**: Jira, Slack, Teams, Google Calendar. Keychain: `userData/secure/keychain.enc` (safeStorage). |
| **Windows** | `windows.ts` | Main BrowserWindow, load app (dev vs prod), tray preview window. |
| **Tray** | `tray.ts` | System tray icon, recording state, menu (New note, Pause/Resume, Open, Quit). |
| **Database** | `storage/database.ts` | better-sqlite3, `userData/data/syag.db`, WAL. Tables: notes (id, title, date, time, duration, time_range, personal_notes, transcript, summary, folder_id, coaching_metrics), folders, settings. CRUD + migrations. |
| **Migrations** | `storage/migrations.ts` | Schema versions; notes get time_range, coaching_metrics in later migrations. |
| **Documents sync** | `storage/documents-sync.ts` | Sync notes to local Markdown/files. |
| **Export** | `export/docx-exporter.ts`, `export/pdf-exporter.ts`, `export/note-html-template.ts` | Export note to DOCX, PDF, or HTML. |
| **Integrations** | `integrations/jira-api.ts`, `jira-auth.ts`, `google-auth.ts`, `google-calendar.ts` | Jira, Google Calendar; secrets in keychain. |
| **Action reminders** | `action-reminders.ts` | Reminders derived from notes/summaries. |

---

### 3. Recording & STT pipeline

| Step | Where | What |
|------|--------|------|
| 1. Capture | Renderer | **RecordingContext** starts capture: mic + (optional) system audio via `getUserMedia` + desktop capture; AudioContext 16 kHz; **AudioWorklet** `public/audio-processor.js`. |
| 2. Worklet | `public/audio-processor.js` | Two channels (0 = mic, 1 = system); emits `audio-chunk` with `pcm` (Float32Array) and `channel`. |
| 3. To main | Preload + IPC | `recording:audio-chunk` → **processAudioChunk** in main. |
| 4. Buffers | `audio/capture.ts` | Per-channel **audioBuffers** (arrays of Float32Array chunks). **Chunk timer** runs every **5 s** (active) / **15 s** (idle); when enough samples, **processBufferedAudio** runs. Early trigger at **4 s** of data for low-latency first result. |
| 5. VAD & gate | `audio/capture.ts` | **runVAD** (Silero) on merged buffer; min speech duration and energy per channel (stricter for “You”). If no speech or too quiet, skip STT. |
| 6. STT | `audio/capture.ts` | Build WAV from (optionally VAD-extracted) speech; **currentSTTModel** from `recording:start`. **local:** → **processWithLocalSTT** (MLX or whisper.cpp). **system:** → macOS Speech. Else → **routeSTT** (cloud). Optional **defer**: transcribe once when recording stops (Settings). |
| 7. Local STT | `models/stt-engine.ts` | **processWithLocalSTT**: MLX Whisper (Python worker, `mlx-whisper` or 8-bit) or whisper.cpp CLI + ggml model. Temp WAV; word timestamps when supported. |
| 8. Cloud STT | `cloud/router.ts` → `cloud/*.ts` | **routeSTT(wavBuffer, model)** → keychain **getApiKey(providerId)** → OpenAI, Deepgram, Groq, AssemblyAI, Copart. |
| 9. Transcript | `capture.ts` | **filterHallucinatedTranscript** (per segment) → **transcriptCallback** `{ speaker, time, text, words? }` → IPC `recording:transcript-chunk` → renderer. |

Constants: `SAMPLE_RATE = 16000`, `CHUNK_INTERVAL_ACTIVE_MS = 5000`, `CHUNK_INTERVAL_IDLE_MS = 15000`, `MIN_SAMPLES_PER_CHANNEL` (2 s), `EARLY_TRIGGER_SAMPLES` (4 s). Speaker labels: channel 0 → “You”, channel 1 → “Others”.

---

### 4. AI / LLM & models

| Component | Location | Role |
|-----------|----------|------|
| **Cloud router** | `cloud/router.ts` | **routeLLM(messages, model, onChunk)**, **routeSTT(wavBuffer, model)**. Model format `providerId:modelName`. **getApiKey(providerId)** from keychain. |
| **Providers** | `cloud/*.ts` | OpenAI, Anthropic, Google, Groq (chat + STT), Deepgram, AssemblyAI, Copart (chat + STT). **apple-llm**: Apple Foundation / on-device LLM when available. |
| **Summarization** | `models/llm-engine.ts` | **summarize(transcript, personalNotes, model, templateId)** from templates; **chat** for Ask bar and streaming. Local LLM via node-llama-cpp when selected. |
| **Model manager** | `models/manager.ts` | **getModelsDir** = `~/.syag/models`. **MODEL_URLS**: whisper.cpp ggml, silero-vad, ecapa-tdnn, GGUF (Llama, Phi, Gemma). **downloadModel**, **listDownloadedModels**, **getModelPath**. |
| **STT engine** | `models/stt-engine.ts` | **processWithLocalSTT**: MLX Whisper (Python), whisper.cpp CLI. **ensureWhisperBinary**, **installMLXWhisper** (returns step log for UI), **checkMLXWhisperAvailable**. User-facing setup: [docs/local-stt-setup.md](docs/local-stt-setup.md). |
| **Templates** | `models/templates.ts` | Meeting summary prompt templates. |

---

### 5. Audio & VAD

| File | Role |
|------|------|
| `audio/capture.ts` | Timer-driven buffers, processBufferedAudio, VAD gate, WAV build, STT dispatch, filterHallucinatedTranscript, transcript callback, pause/resume, defer transcription. |
| `audio/vad.ts` | **runVAD(audio, sampleRate)** via **silero-vad** ONNX (auto-download to models dir). **ensureVADModel**. |
| `audio/processor.ts` | Resampling and helpers. |
| `audio/diarization.ts`, `audio/speaker-embeddings.ts` | Optional speaker diarization (ecapa-tdnn); default “You”/“Others” is channel-based. |
| `audio/stt-system-darwin.ts` | macOS system Speech Recognition (when STT model is `system:*`). |

---

### 6. Meeting detection & calendar

| File | Role |
|------|------|
| `meeting-detector.ts` | Polls frontmost app (e.g. Zoom, Meet). Meeting start/end → `meeting:detected` / `meeting:ended` to renderer. Uses calendar events (set via `meeting:set-calendar-events`) for title/context. |
| **Calendar** | Renderer: CalendarContext, CalendarPage; ICS import (ICSDialog). Events to main via `meeting:set-calendar-events`. |

---

### 7. Security & keychain

- **API keys** in `userData/secure/keychain.enc`, encrypted with Electron **safeStorage**.
- Key = provider id (e.g. `openai`, `deepgram`). Set from Settings when connecting a provider; read in main by **router.getApiKey** and IPC **keychain:get** for UI.
- No API keys in renderer; all LLM/STT and cloud calls from main.

---

### 8. Transcript display & utils

| File | Role |
|------|------|
| `audio/capture.ts` | **filterHallucinatedTranscript** (main): strip common STT hallucinations and blank/rep-only text before sending each chunk. |
| `lib/transcript-utils.ts` | **groupTranscriptBySpeaker**, **parseTimeToSeconds**, paragraph grouping and splitting for display. |

---

### 9. Data flow summary

- **Notes:** Renderer ↔ IPC ↔ **database.ts** (SQLite).
- **Transcript:** AudioWorklet → IPC `recording:audio-chunk` → **capture.ts** (buffers → timer → VAD → STT) → filter → IPC `recording:transcript-chunk` → **RecordingContext** → UI.
- **Summaries / chat:** NewNotePage / NoteDetailPage / AskSyag → IPC `llm:summarize` / `llm:chat` → **llm-engine** + **router** → cloud (or local LLM) → result to renderer.
- **Models & keys:** Settings → IPC models/download, keychain/set → main; **ModelSettingsContext** syncs selected STT/AI model and connected providers.

---

## Development

For day-to-day dev, use the commands in the [Run from source](#option-2-run-from-source-local-repo) table above. Quick reference: `npm ci` then `npm run dev:electron`.

**Tests:** `npm test` (Vitest). Tests live in `src/test/` (e.g. `ics-parser.test.ts`, `stt-model.test.ts`, `stt-quality-fixes.test.ts`, `diarization-cluster.test.ts`).

**Lint:** `npm run lint`.

**Dependencies:** The project uses jsdom ^24 and Vite ^6 for tests and build; `package.json` includes `overrides` for `glob` and `whatwg-encoding` to keep transitive deps updated and reduce deprecation/security warnings. Run `npm audit` to check for vulnerabilities.

**Versioning:** Bump `version` in `package.json` before releasing (e.g. `1.0.3` → `1.0.4`).

---

## Build & release

```bash
# Build main + renderer
npm run build

# Package (default: mac; config in package.json "build")
npm run package
```

Output: **dist/** — DMG and zip (macOS only). Version from `package.json`.

**GitHub Releases:** Push a version tag (e.g. `v1.0.5`) to trigger the Release workflow (`.github/workflows/release.yml`): builds on macOS only and attaches the DMG/zip to the release. Users download from the repo’s Releases page; no API keys or data are bundled. If the workflow fails with "Artifact storage quota has been hit", delete old workflow artifacts (Actions → run → Delete workflow run, or reduce retention in Settings → Actions) to free space.

**Updates preserve your data:** Installing a new build over an existing install (e.g. replacing Syag.app in Applications) keeps your notes, API keys, and settings. User data lives in `~/Library/Application Support/Syag` (macOS) and is tied to the app identity, not the build—like an in-place update without OTA.

---

## Project layout

```
electron/
  main/
    index.ts              # App lifecycle, tray, IPC, DB init
    ipc-handlers.ts       # All IPC handlers, keychain
    windows.ts            # Main window, tray preview
    tray.ts               # System tray icon and menu
    meeting-detector.ts   # Meeting start/end, calendar context
    power-manager.ts
    action-reminders.ts
    storage/
      database.ts         # SQLite CRUD (notes, folders, settings)
      migrations.ts
      documents-sync.ts   # Sync notes to Markdown
    models/
      manager.ts          # Model paths, download, list (whisper, vad, GGUF)
      stt-engine.ts       # Local STT (MLX Whisper, whisper.cpp)
      llm-engine.ts       # Summarization, chat (cloud + local)
      templates.ts
    audio/
      capture.ts          # Buffers, timer, VAD gate, STT, transcript callback
      vad.ts              # Silero VAD
      processor.ts
      diarization.ts
      speaker-embeddings.ts
      stt-system-darwin.ts
    cloud/
      router.ts           # routeLLM, routeSTT, getApiKey
      openai.ts, anthropic.ts, google.ts, groq.ts
      deepgram.ts, assemblyai.ts, copart.ts
      apple-llm.ts
      net-request.ts
    export/
      docx-exporter.ts
      pdf-exporter.ts
      note-html-template.ts
    integrations/
      jira-api.ts, jira-auth.ts
      google-auth.ts, google-calendar.ts
  preload/
    index.ts               # contextBridge electronAPI
public/
  audio-processor.js       # AudioWorklet (mic + system, 2 channels)
src/
  App.tsx                  # Providers, Router, GlobalRecordingBanner, MeetingDetectionHandler
  main.tsx
  contexts/                # Recording, Notes, Folders, ModelSettings, Calendar, SidebarVisibility
  pages/                   # Index, AllNotes, NewNote, NoteDetail, Calendar, Coaching, Settings, AskSyag, Onboarding
  components/              # TrayMenu, AskBar, EditableSummary, Sidebar, ICSDialog, Jira/Slack/Teams dialogs, etc.
  lib/
    electron-api.ts        # Typed electronAPI
    transcript-utils.ts    # Grouping, timestamps, paragraphs
    ics-parser.ts
    export-markdown.ts
    coaching-analytics.ts
    stt-model.ts
    diarization-cluster.ts
  test/                    # Vitest tests
```

---

## License

MIT
