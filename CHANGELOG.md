# Changelog

All notable changes to Syag are documented here. **Keep this file updated with every release** so you can see which release had what changes.

---

## [1.8.0] — 2026-03-20

### Added
- **iCloud Drive sync:** Opt-in sync via iCloud Drive (Settings > Sync). Local-first architecture with JSONL change logs — SQLite never touches iCloud directly, avoiding WAL corruption. Syncs notes, folders, people, commitments, topics, and UI preferences across all your Macs.
- **Sync status indicator:** Cloud icon in the sidebar header shows real-time sync state (synced, syncing, offline, error). Hidden when sync is disabled.
- **Sync settings UI:** New "Sync" section in Settings with enable/disable toggle, device count, last sync time, and force-sync button.
- **Auto-backup on sync toggle:** 3 rolling backups created automatically before enabling or disabling sync.
- **Device bootstrapping:** New devices joining an existing sync automatically restore from the latest snapshot and replay pending changes.
- **Dismissable floating indicator:** External recording overlay can now be dismissed; reappears on next meeting or when main window is refocused.
- **Shared meeting indicator pill:** Extracted `MeetingIndicatorPill` component shared between in-app and floating indicator views.
- **Preferences event bus:** `preferences-events.ts` dispatches changes so components react instantly when settings toggle (e.g., recording indicator on/off).

### Changed
- **Sync resource optimization:** Watcher reads JSONL from byte cursor (not full file), caches device file list, and skips reads when file size is unchanged. Logger buffers writes (2s flush interval). Replayer batches seenIds persistence and caches schema version. UI status polling reduced from 30s to 5-min heartbeat. Manifest cached in memory with 60s TTL. Together these cut idle I/O by ~75%.
- **Recording indicator respects settings:** Floating overlay and in-app pill now check the "Live recording indicator" preference before showing, and update immediately when toggled.
- **LiveMeetingIndicator simplified:** Refactored to use shared `MeetingIndicatorPill`, reducing duplication.
- **FloatingIndicator streamlined:** Uses shared pill component and formats; code reduced ~40%.

### Fixed
- **Sync change logging:** All data stores (notes, folders, people, commitments, topics, note_people, note_topics, settings) now emit sync change records on every mutation.

## [1.7.0]

- **Fix false "You were mentioned" alerts:** Mention detection now only triggers on speech from others (system audio), not your own mic. Fuzzy Levenshtein matching removed — only exact name matches trigger alerts.
- **Faster "What should I say?" and slash prompts:** Slash-menu prompts (TL;DR, What should I say, Coach me, etc.) now use only the last 25 transcript lines and a lean system prompt, dramatically reducing response time for long meetings.
- **Clean chat UI:** Slash prompts show a friendly label ("What should I say?") in the chat bubble instead of the raw system instruction.
- **Content protection wired up:** "Hide from screen share" toggle in Settings now actually works — calls Electron's setContentProtection API.
- **NoteDetailPage pause fix:** Pause button in the AskBar on saved notes now correctly pauses recording instead of crashing.
- **Dead code cleanup:** Removed 8 unused components (MeetingPage, MeetingDetail, HomeShelf, MeetingCard, ActionItemsThisWeek, CompactCommitmentsCard, CoachingPulseCard, LiveCoachOverlay) and dead data/meetings.ts.
- **Unified folder state:** Removed duplicate note-to-folder tracking from FolderContext; NotesContext is now the single source of truth for folder assignments.
- **DRY helpers:** Consolidated duplicate `parseTimeToSeconds` (3 copies) and `countWords` (2 copies) into shared exports in `transcript-utils.ts`.
- **Shared constants:** SettingsPage now imports `ACCOUNT_LS_KEY` from `account-context.ts` instead of redefining it.
- **Tests updated:** Account-context tests updated to match strict matching behavior; all 112 tests pass.

## [1.6.0]

- **Conversation analysis fix:** AI model resolver now reads from both legacy and new settings storage, fixing "conversation analysis didn't complete" errors.
- **My To-dos:** Commitments page gains a "My" filter showing action items assigned to you, plus a personal to-do input for quick adds.
- **Editable assignees:** "Me" and "Unassigned" action item assignees are now click-to-edit inline.
- **Ask Syag improvements:** Recipe chips (TL;DR, Action items, Weekly recap) now send focused prompts; context size bounded to prevent generic responses.
- **Diarization toggle:** Disabled with "Coming soon" label until backend wiring is complete.
- **Cleanup:** Removed enterprise provider code from main repo; optional providers can still be loaded from `userData/optional-providers/`.

## [1.3.2]

- **Action items:** Summaries default to **unassigned** owners; no auto-**Me**/**You** from the model. Optional `accountDisplayName` on summarize for assignee normalization.
- **Jira:** Icon-only control in the action-items table (no visible “Jira” label).
- **Coaching:** Meeting-effectiveness prompt and UI (transcript + role first); metrics-only coaching as fallback when transcript analysis fails; supporting signals labeled as secondary.

## [1.3.1]

- **Conversation coaching (Work Coach–style):** Transcript-grounded analysis with headline, narrative, evidence-linked micro-insights, habit tags, and key moments (jump-to in transcript). Role KB excerpt + deterministic heuristics (questions, monologue, sales cues). Cross-meeting synthesis on Coaching page; optional audio clips documented as future opt-in (`docs/coaching-audio-opt-in.md`).
- **Tray agenda:** Tray window / agenda sync flow (`tray-agenda-window`, `TrayAgendaPage`, `TrayAgendaSync`).
- **Capture & STT:** Per-channel Whisper context continuity; mic debug logging merged with buffer drain fixes; calendar sync labels (`getSyncLabel`).
- **Docs:** `docs/local-stt-setup.md`, `docs/optional-provider-install.md`, `docs/transcript-me-them.md`, README architecture reference.
- **Repo hygiene:** `.cursor/` in `.gitignore`.

## [1.3.0]

- **Screenshot / recording privacy:** Content protection replaced with window hide/show; Syag can be hidden from screen share during recording.
- **Local Llama:** Summarization and chat when using a local model now use fixed context (8192) and 4 threads to avoid overwhelming the machine.
- **Optional providers:** Optional providers can be loaded from `userData/optional-providers/`. See docs for installing optional providers.

## [1.1.2]

- **Audio reliability & zombie process fix:** Safer cleanup of STT workers and processes.
- **Safe JSON parse:** More robust parsing for stored transcript/summary data.
- **UI/data:** Built-in template list and tests added (`src/data/templates.ts`, `src/data/__tests__/templates.test.ts`).
- **Optional providers:** Generic optional-provider loader for add-on integrations.

## [1.1.1]

- **Same codebase as 1.1.0**, with an additional built-in provider (no optional-provider setup required).
- Tag `v1.1.1` points to the same commit as `v1.1.0` for testing the pre–optional-provider setup.

## [1.1.0]

- **Read-only Agent API** via Unix domain socket for AI agents and tools to query notes locally.
- **Enterprise provider** built-in for chat and STT when configured in Settings.
- Core meeting notes, summaries, calendar, and coaching features.

---

## Maintaining this log

- **On every release:** Add a new `## [X.Y.Z]` section at the top (below this note) with bullet points for what changed in that release.
- **When tagging:** Run your usual release flow; keep the tag and the CHANGELOG section in sync so `git show vX.Y.Z` and the log match.
- **Optional:** Copy the release notes into the GitHub Release body when creating the release.
