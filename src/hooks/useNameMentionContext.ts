import { useEffect, useRef, useState, useCallback } from "react";
import { getElectronAPI } from "@/lib/electron-api";
import {
  loadAccountFromStorage,
  accountNameAppearsInText,
  formatRecentTranscriptForMention,
} from "@/lib/account-context";

const COOLDOWN_MS = 75_000;

const NO_MODEL_HINT =
  "You were mentioned. Open Ask below and try “What should I say?” or type / for prompts.";

const LLM_SYSTEM =
  "You help someone who was just addressed by name in a live meeting transcript. In one concise sentence (no greeting), state what topic or question they should speak to, or what others seem to expect from them. If unclear, say what the discussion is about right now.";

type Line = { speaker: string; time: string; text: string };

/**
 * When the latest transcript line mentions the user's account name, fetches a one-line
 * context summary for the Ask bar (or shows a static hint if no AI model is selected).
 */
export function useNameMentionContext(
  transcriptLines: Line[],
  recordingState: "recording" | "paused" | "stopped",
  selectedAIModel: string | null | undefined,
  meetingTitle: string,
  usingRealAudio: boolean,
  noteId: string
) {
  const [mentionHint, setMentionHint] = useState<string | null>(null);
  const [mentionHintLoading, setMentionHintLoading] = useState(false);
  const lastMentionLlmAt = useRef(0);
  const dismissedRef = useRef(false);
  const prevLenForDismissRef = useRef(0);
  const processedLineKeyRef = useRef("");
  const pendingLineKeyRef = useRef("");
  const hasSeededRef = useRef(false);
  const lastNoteIdRef = useRef(noteId);

  const onDismissMentionHint = useCallback(() => {
    dismissedRef.current = true;
    setMentionHint(null);
    setMentionHintLoading(false);
  }, []);

  useEffect(() => {
    if (noteId !== lastNoteIdRef.current) {
      lastNoteIdRef.current = noteId;
      processedLineKeyRef.current = "";
      pendingLineKeyRef.current = "";
      hasSeededRef.current = false;
      prevLenForDismissRef.current = 0;
      setMentionHint(null);
      setMentionHintLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (!usingRealAudio || recordingState !== "recording") {
      if (recordingState !== "recording") {
        setMentionHint(null);
        setMentionHintLoading(false);
      }
      return;
    }

    const account = loadAccountFromStorage();
    const name = account.name?.trim();
    if (!name || name.length < 2) return;

    const len = transcriptLines.length;
    if (len === 0) return;
    const last = transcriptLines[len - 1];

    if (len > prevLenForDismissRef.current) {
      dismissedRef.current = false;
    }
    prevLenForDismissRef.current = len;

    const lineKey = `${len}|${last.time}|${last.text.slice(0, 400)}`;

    // Skip LLM on initial transcript backlog (joining mid-session with multiple lines already)
    if (!hasSeededRef.current) {
      hasSeededRef.current = true;
      if (len > 1) {
        processedLineKeyRef.current = lineKey;
        return;
      }
    }

    if (lineKey === processedLineKeyRef.current) return;
    if (lineKey === pendingLineKeyRef.current) return;

    if (!accountNameAppearsInText(name, last.text)) return;
    if (dismissedRef.current) return;

    if (!selectedAIModel) {
      processedLineKeyRef.current = lineKey;
      setMentionHint(NO_MODEL_HINT);
      return;
    }

    if (Date.now() - lastMentionLlmAt.current < COOLDOWN_MS) return;

    const api = getElectronAPI();
    if (!api?.llm?.chat) {
      processedLineKeyRef.current = lineKey;
      setMentionHint(NO_MODEL_HINT);
      return;
    }

    pendingLineKeyRef.current = lineKey;
    setMentionHintLoading(true);

    let cancelled = false;
    const recent = formatRecentTranscriptForMention(transcriptLines, 14);
    const userContent = `Meeting: ${meetingTitle || "Untitled"}\nUser's name (mentioned): ${name}\n\nRecent transcript:\n${recent}`;

    void (async () => {
      try {
        const response = await api.llm.chat({
          messages: [
            { role: "system", content: LLM_SYSTEM },
            { role: "user", content: userContent },
          ],
          model: selectedAIModel,
        });
        if (cancelled) return;
        const line = (response || "").trim().split(/\n+/)[0]?.trim() || "";
        setMentionHint(line || NO_MODEL_HINT);
        processedLineKeyRef.current = lineKey;
        lastMentionLlmAt.current = Date.now();
      } catch {
        if (!cancelled) {
          setMentionHint("Couldn’t load a quick summary. Try Ask with “What should I say?”");
          processedLineKeyRef.current = lineKey;
        }
      } finally {
        pendingLineKeyRef.current = "";
        if (!cancelled) setMentionHintLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [transcriptLines, recordingState, selectedAIModel, meetingTitle, usingRealAudio, noteId]);

  return { mentionHint, mentionHintLoading, onDismissMentionHint };
}
