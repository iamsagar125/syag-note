import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { isElectron, getElectronAPI } from "@/lib/electron-api";

interface RecordingSession {
  noteId: string;
  title: string;
  elapsedSeconds: number;
  isRecording: boolean;
  startTime: number; // Date.now() when recording started
}

/** Transcript line: speaker is "You" (user/mic) or "Others" (system/remote). UI shows "Me" / "Them". */
export type TranscriptLine = { speaker: string; time: string; text: string };

/** Word with absolute start/end (seconds) and speaker for stable/tail merge. */
type TranscriptWord = { word: string; start: number; end: number; speaker: string };

const TAIL_WINDOW_SEC = 10
const OVERLAP_DEDUPE_SEC = 1
const TIME_EPSILON = 0.05

/** Parse "m:ss" to seconds. */
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(":").map((p) => parseInt(p, 10))
  if (parts.length >= 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return parts[0] || 0
}

/** Convert stable + tail words into display lines (group by speaker, break on gap). Returns lines and each line's time range for removal. */
function wordsToLinesWithRanges(
  stable: TranscriptWord[],
  tail: TranscriptWord[]
): { lines: TranscriptLine[]; ranges: { start: number; end: number }[] } {
  const all = [...stable, ...tail].sort((a, b) => a.start - b.start)
  if (all.length === 0) return { lines: [], ranges: [] }
  const lines: TranscriptLine[] = []
  const ranges: { start: number; end: number }[] = []
  let lineSpeaker = all[0].speaker
  let lineStart = all[0].start
  let lineEnd = all[0].end
  let lineWords: string[] = [all[0].word]
  for (let i = 1; i < all.length; i++) {
    const w = all[i]
    const prev = all[i - 1]
    const gap = w.start - prev.end
    if (w.speaker !== lineSpeaker || gap > 2) {
      const m = Math.floor(lineStart / 60)
      const s = Math.floor(lineStart % 60)
      lines.push({
        speaker: lineSpeaker,
        time: `${m}:${String(s).padStart(2, "0")}`,
        text: lineWords.join(" ").trim(),
      })
      ranges.push({ start: lineStart, end: lineEnd })
      lineSpeaker = w.speaker
      lineStart = w.start
      lineEnd = w.end
      lineWords = [w.word]
    } else {
      lineWords.push(w.word)
      lineEnd = w.end
    }
  }
  const m = Math.floor(lineStart / 60)
  const s = Math.floor(lineStart % 60)
  lines.push({
    speaker: lineSpeaker,
    time: `${m}:${String(s).padStart(2, "0")}`,
    text: lineWords.join(" ").trim(),
  })
  ranges.push({ start: lineStart, end: lineEnd })
  return { lines, ranges }
}

function wordsToLines(stable: TranscriptWord[], tail: TranscriptWord[]): TranscriptLine[] {
  return wordsToLinesWithRanges(stable, tail).lines
}

/** Merge new segment into tail: in overlap zone prefer later (new) segment's words. */
function mergeTailWithNew(
  tail: TranscriptWord[],
  newWords: TranscriptWord[],
  overlapSec: number
): TranscriptWord[] {
  if (tail.length === 0) return [...newWords]
  if (newWords.length === 0) return tail
  const tailEnd = Math.max(...tail.map((w) => w.end))
  const overlapStart = Math.max(tailEnd - overlapSec, 0)
  const tailBeforeOverlap = tail.filter((w) => w.end <= overlapStart)
  return [...tailBeforeOverlap, ...newWords].sort((a, b) => a.start - b.start)
}

export const CAPTURE_ERROR_NO_SOURCE =
  'No microphone or system audio. Allow microphone access in System Settings (Privacy & Security → Microphone) and optionally Screen Recording for system audio.';

interface RecordingContextType {
  activeSession: RecordingSession | null;
  isActive: boolean;
  startSession: (noteId: string) => void;
  /** Restore session after "stopped" so user can resume recording without clearing transcript. */
  resumeSession: (noteId: string, title: string, elapsedSeconds: number) => void;
  updateSession: (updates: Partial<RecordingSession>) => void;
  clearSession: () => void;
  transcriptLines: TranscriptLine[];
  /** Remove a transcript line by index (e.g. for delete-chunk in transcript panel). */
  removeTranscriptLineAt: (index: number) => void;
  /** Remove multiple transcript lines by indices (e.g. when deleting a grouped block). */
  removeTranscriptLinesAt: (indices: number[]) => void;
  isCapturing: boolean;
  usingWebSpeech: boolean;
  /** Set when capture failed (e.g. no mic, worklet load failed). Clear on retry or when user dismisses. */
  captureError: string | null;
  clearCaptureError: () => void;
  /** STT pipeline state: idle, processing (VAD+STT running), or error (last chunk failed). */
  sttStatus: 'idle' | 'processing' | 'error';
  /** Last error message from STT (when sttStatus === 'error'). */
  sttErrorMessage: string | null;
  /** Timestamp of last successful transcript chunk (for stale hint). */
  lastSuccessfulTranscriptTime: number | null;
  /** True when system (desktop/window) audio was successfully captured; false when mic-only. */
  systemAudioActive: boolean;
  startAudioCapture: (sttModel: string, options?: { meetingTitle?: string; vocabulary?: string[] }) => Promise<void>;
  stopAudioCapture: () => Promise<void>;
  pauseAudioCapture: () => Promise<void>;
  resumeAudioCapture: (sttModel?: string) => Promise<void>;
  /** Scratch for current session (personalNotes, title, userEditedTitle) so indicator pause-and-summarize can restore state when navigating back. */
  setSessionScratch: (scratch: { personalNotes?: string; title?: string; userEditedTitle?: boolean }) => void;
  getSessionScratch: () => { personalNotes?: string; title?: string; userEditedTitle?: boolean };
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSession] = useState<RecordingSession | null>(null);
  const [transcriptState, setTranscriptState] = useState<{ stable: TranscriptWord[]; tail: TranscriptWord[] }>({
    stable: [],
    tail: [],
  });
  const transcriptLines = useMemo(
    () => wordsToLines(transcriptState.stable, transcriptState.tail),
    [transcriptState.stable, transcriptState.tail]
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [systemAudioActive, setSystemAudioActive] = useState(false);
  const [usingWebSpeech, setUsingWebSpeech] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [sttStatus, setSttStatus] = useState<'idle' | 'processing' | 'error'>('idle');
  const [sttErrorMessage, setSttErrorMessage] = useState<string | null>(null);
  const [lastSuccessfulTranscriptTime, setLastSuccessfulTranscriptTime] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const speechRecRef = useRef<any>(null);
  const elapsedRef = useRef(0);
  const sessionScratchRef = useRef<{ personalNotes?: string; title?: string; userEditedTitle?: boolean }>({});

  const api = getElectronAPI();

  const setSessionScratch = useCallback((scratch: { personalNotes?: string; title?: string; userEditedTitle?: boolean }) => {
    sessionScratchRef.current = { ...sessionScratchRef.current, ...scratch };
  }, []);
  const getSessionScratch = useCallback(() => ({ ...sessionScratchRef.current }), []);

  useEffect(() => {
    if (!api) return;

    const cleanupTranscript = api.recording.onTranscriptChunk((chunk) => {
      if (chunk.text.startsWith("[STT Error:")) {
        const message = chunk.text.replace(/^\[STT Error:\s*/i, "").replace(/\]$/, "").trim() || "Transcription failed.";
        toast.error(message, { duration: 6000 });
      } else {
        setLastSuccessfulTranscriptTime(Date.now());
      }
      const words: TranscriptWord[] =
        chunk.words?.length ?
          chunk.words.map((w) => ({ word: w.word, start: w.start, end: w.end, speaker: chunk.speaker }))
        : [{ word: chunk.text, start: parseTimeToSeconds(chunk.time), end: parseTimeToSeconds(chunk.time), speaker: chunk.speaker }];
      setTranscriptState((prev) => {
        const newTail = mergeTailWithNew(prev.tail, words, OVERLAP_DEDUPE_SEC);
        const latest = newTail.length ? Math.max(...newTail.map((w) => w.end)) : 0;
        const tailCut = latest - TAIL_WINDOW_SEC;
        const toStable = newTail.filter((w) => w.end < tailCut);
        const newTailFiltered = newTail.filter((w) => w.end >= tailCut);
        return {
          stable: [...prev.stable, ...toStable],
          tail: newTailFiltered,
        };
      });
    });

    // Note: auto-paused/auto-resumed are not currently emitted (auto-pause on silence is disabled in capture.ts).
    // Manual pause is the only path that updates isRecording.
    const cleanupStatus = api.recording.onRecordingStatus((status) => {
      if (status.state === 'auto-paused') {
        setActiveSession(prev => prev ? { ...prev, isRecording: false } : null);
      } else if (status.state === 'auto-resumed') {
        setActiveSession(prev => prev ? { ...prev, isRecording: true } : null);
      } else if (status.state === 'stt-processing') {
        setSttStatus('processing');
        setSttErrorMessage(null);
      } else if (status.state === 'stt-idle') {
        setSttStatus(status.error ? 'error' : 'idle');
        setSttErrorMessage(status.error ?? null);
      }
    });

    cleanupRef.current = cleanupTranscript;

    return () => { cleanupTranscript(); cleanupStatus(); };
  }, []);

  const removeTranscriptLineAt = useCallback((index: number) => {
    setTranscriptState((prev) => {
      const { ranges } = wordsToLinesWithRanges(prev.stable, prev.tail);
      if (index < 0 || index >= ranges.length) return prev;
      const r = ranges[index];
      const inRange = (w: TranscriptWord) =>
        w.start >= r.start - TIME_EPSILON && w.end <= r.end + TIME_EPSILON;
      return {
        stable: prev.stable.filter((w) => !inRange(w)),
        tail: prev.tail.filter((w) => !inRange(w)),
      };
    });
  }, []);

  const removeTranscriptLinesAt = useCallback((indices: number[]) => {
    const indexSet = new Set(indices);
    setTranscriptState((prev) => {
      const { ranges } = wordsToLinesWithRanges(prev.stable, prev.tail);
      const toRemove = new Set(indices.filter((i) => i >= 0 && i < ranges.length).map((i) => ranges[i]));
      const inAnyRange = (w: TranscriptWord) =>
        [...toRemove].some(
          (r) => w.start >= r.start - TIME_EPSILON && w.end <= r.end + TIME_EPSILON
        );
      return {
        stable: prev.stable.filter((w) => !inAnyRange(w)),
        tail: prev.tail.filter((w) => !inAnyRange(w)),
      };
    });
  }, []);

  // Global elapsed timer -- ticks regardless of which page is mounted
  useEffect(() => {
    if (!activeSession?.isRecording) return;
    const id = setInterval(() => {
      setActiveSession((prev) => prev && prev.isRecording
        ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }
        : prev
      );
    }, 1000);
    return () => clearInterval(id);
  }, [activeSession?.isRecording]);

  const startSession = useCallback((noteId: string) => {
    const now = Date.now();
    setActiveSession({ noteId, title: "New note", elapsedSeconds: 0, isRecording: true, startTime: now });
    setTranscriptState({ stable: [], tail: [] });
    // Inform tray about meeting info
    if (api) {
      api.app.updateTrayMeetingInfo?.({ title: "New note", startTime: now });
    }
  }, [api]);

  const resumeSession = useCallback((noteId: string, title: string, elapsedSeconds: number) => {
    const startTime = Date.now() - elapsedSeconds * 1000;
    setActiveSession({ noteId, title: title || "New note", elapsedSeconds, isRecording: true, startTime });
    if (api) {
      api.app.updateTrayMeetingInfo?.({ title: title || "New note", startTime });
    }
  }, [api]);

  const updateSession = useCallback((updates: Partial<RecordingSession>) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updates };
      // Sync title changes to tray
      if (updates.title && api) {
        api.app.updateTrayMeetingInfo?.({ title: next.title, startTime: next.startTime });
      }
      return next;
    });
  }, [api]);

  const clearSession = useCallback(() => {
    setActiveSession(null);
    sessionScratchRef.current = {};
    if (api) {
      api.app.updateTrayMeetingInfo?.(null);
    }
  }, [api]);

  // Keep elapsed ref in sync for Web Speech API callback
  useEffect(() => {
    elapsedRef.current = activeSession?.elapsedSeconds ?? 0;
  }, [activeSession?.elapsedSeconds]);

  const stopSpeechRecognition = useCallback(() => {
    if (speechRecRef.current) {
      try { speechRecRef.current.abort(); } catch {}
      speechRecRef.current = null;
    }
    setUsingWebSpeech(false);
  }, []);

  const startSpeechRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('Web Speech API not available in this environment');
      return;
    }

    stopSpeechRecognition();

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          if (text && text.trim()) {
            const seconds = elapsedRef.current;
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            setTranscriptLines(prev => [...prev, {
              speaker: 'You',
              time: `${m}:${String(s).padStart(2, '0')}`,
              text: text.trim()
            }]);
          }
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        speechRecRef.current = null;
        setUsingWebSpeech(false);
      }
    };

    recognition.onend = () => {
      if (speechRecRef.current === recognition) {
        try { recognition.start(); } catch {}
      }
    };

    try {
      recognition.start();
      speechRecRef.current = recognition;
      setUsingWebSpeech(true);
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
    }
  }, [stopSpeechRecognition]);

  const clearCaptureError = useCallback(() => setCaptureError(null), []);

  const startAudioCapture = useCallback(async (sttModel: string, options?: { meetingTitle?: string; vocabulary?: string[] }) => {
    if (!api) return;
    setCaptureError(null);
    setSttStatus('idle');
    setSttErrorMessage(null);

    // Read the user-selected audio device from DB
    let preferredDeviceId: string | undefined;
    try {
      const storedDevice = await api.db.settings.get('audio-input-device');
      if (storedDevice) preferredDeviceId = storedDevice;
    } catch {}

    try {
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const actualSampleRate = audioCtx.sampleRate;
      if (actualSampleRate !== 16000) {
        console.warn('[Recording] AudioContext sample rate is', actualSampleRate, 'Hz (requested 16000); main will resample for STT.')
      }

      await api.recording.start({
        sttModel: sttModel || '',
        meetingTitle: options?.meetingTitle,
        vocabulary: options?.vocabulary,
        sampleRate: actualSampleRate,
      });

      const workletCandidates = isElectron
        ? [
            new URL('./audio-processor.js', window.location.href).href,
            '/audio-processor.js',
            new URL('audio-processor.js', window.location.origin + '/').href,
          ]
        : ['/audio-processor.js'];
      let workletLoaded = false;
      for (const workletUrl of workletCandidates) {
        try {
          await audioCtx.audioWorklet.addModule(workletUrl);
          workletLoaded = true;
          break;
        } catch (e) {
          console.warn('Worklet load failed for', workletUrl, e);
        }
      }
      if (!workletLoaded) {
        const msg = 'Could not load audio capture. Try restarting the app.';
        setCaptureError(msg);
        setIsCapturing(false);
        throw new Error(msg);
      }

      const merger = audioCtx.createChannelMerger(2);
      const worklet = new AudioWorkletNode(audioCtx, 'syag-audio-processor');
      workletNodeRef.current = worklet;

      worklet.port.onmessage = (event) => {
        if (event.data.type === 'audio-chunk') {
          const channel = event.data.channel !== undefined ? event.data.channel : 0;
          api.recording.sendAudioChunk(event.data.pcm, channel);
        }
      };

      // 1. Capture microphone audio (use user-selected device if set; fallback if exact device fails)
      try {
        const noiseSuppression = api ? (await api.db.settings.get('audio-noise-suppression')) !== 'false' : true;
        const baseConstraints: MediaTrackConstraints = {
          sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression,
        };
        let micStream: MediaStream | null = null;
        if (preferredDeviceId) {
          try {
            micStream = await navigator.mediaDevices.getUserMedia({
              audio: { ...baseConstraints, deviceId: { exact: preferredDeviceId } },
            });
          } catch {
            console.warn('Preferred audio device unavailable; falling back to default. Clearing stored device.');
            if (api) api.db.settings.set('audio-input-device', '').catch(() => {});
          }
        }
        if (!micStream) {
          micStream = await navigator.mediaDevices.getUserMedia({ audio: baseConstraints });
        }
        micStreamRef.current = micStream;
        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(merger, 0, 0);
      } catch (micErr) {
        console.warn('Microphone access denied or unavailable:', micErr);
      }

      // 2. Capture system audio via desktopCapturer (explicit source so capture is reliable)
      setSystemAudioActive(false);
      try {
        const sources = await api.audio.getDesktopSources();
        if (sources.length > 0) {
          // Prefer first screen so "Entire Screen" is default; otherwise first window
          const screenFirst = sources.find((s) => s.id.startsWith('screen:'));
          const source = screenFirst ?? sources[0];
          const systemStream = await (navigator.mediaDevices as any).getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id,
              }
            },
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id,
                minWidth: 1,
                maxWidth: 1,
                minHeight: 1,
                maxHeight: 1,
              }
            }
          });
          // Remove the video track, we only need audio
          systemStream.getVideoTracks().forEach((t: MediaStreamTrack) => t.stop());

          systemStreamRef.current = systemStream;
          const systemSource = audioCtx.createMediaStreamSource(systemStream);
          systemSource.connect(merger, 0, 1);
          setSystemAudioActive(true);
        }
      } catch (sysErr) {
        console.warn('System audio capture not available (screen recording permission may be needed):', sysErr);
      }

      if (!micStreamRef.current && !systemStreamRef.current) {
        setCaptureError(CAPTURE_ERROR_NO_SOURCE);
      }

      merger.connect(worklet);
      worklet.connect(audioCtx.destination);
      setIsCapturing(true);

      // When no STT model is configured, use Web Speech API as zero-config fallback
      if (!sttModel) {
        startSpeechRecognition();
      }
    } catch (err) {
      console.error('Failed to start audio capture:', err);
      setIsCapturing(false);
      setCaptureError(err instanceof Error ? err.message : 'Failed to start audio capture.');
      // Even if full audio capture failed, try Web Speech API for basic transcription
      if (!sttModel) {
        startSpeechRecognition();
      }
      throw err;
    }
  }, [api, startSpeechRecognition]);

  const pauseAudioCapture = useCallback(async () => {
    if (api) {
      await api.recording.pause();
    }
    if (speechRecRef.current) {
      try { speechRecRef.current.abort(); } catch {}
      speechRecRef.current = null;
      setUsingWebSpeech(false);
    }
    setActiveSession(prev => prev ? { ...prev, isRecording: false } : null);
  }, [api]);

  const resumeAudioCapture = useCallback(async (sttModel?: string) => {
    if (api) {
      await api.recording.resume({ sttModel: sttModel ?? undefined });
    }
    setActiveSession(prev => prev ? { ...prev, isRecording: true } : null);
    // Restart Web Speech API fallback if no STT model
    if (!sttModel && !speechRecRef.current) {
      startSpeechRecognition();
    }
  }, [api, startSpeechRecognition]);

  const stopAudioCapture = useCallback(async () => {
    setIsCapturing(false);
    setSystemAudioActive(false);
    stopSpeechRecognition();

    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ type: 'stop' });
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(t => t.stop());
      systemStreamRef.current = null;
    }

    if (api) {
      await api.recording.stop();
    }
    setSttStatus('idle');
    setSttErrorMessage(null);
  }, [api, stopSpeechRecognition]);

  const isActive = !!activeSession;

  return (
    <RecordingContext.Provider value={{
      activeSession, isActive, startSession, resumeSession, updateSession, clearSession,
      transcriptLines, removeTranscriptLineAt, removeTranscriptLinesAt, isCapturing, systemAudioActive, usingWebSpeech, captureError, clearCaptureError,
      sttStatus, sttErrorMessage, lastSuccessfulTranscriptTime,
      startAudioCapture, stopAudioCapture, pauseAudioCapture, resumeAudioCapture,
      setSessionScratch, getSessionScratch
    }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}
