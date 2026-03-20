import { useState, useEffect, useCallback } from "react";
import { getElectronAPI } from "@/lib/electron-api";
import { MeetingIndicatorPill } from "@/components/MeetingIndicatorPill";

type MeetingState = { title: string; startTime: number; isRecording: boolean } | null;

export default function FloatingIndicator() {
  const [state, setState] = useState<MeetingState>(null);
  const [elapsed, setElapsed] = useState(0);
  const api = getElectronAPI();

  useEffect(() => {
    if (!api?.floating?.onState) return;
    const unsub = api.floating.onState((s: MeetingState) => {
      setState(s);
    });
    return unsub;
  }, [api]);

  useEffect(() => {
    if (!state?.startTime) {
      setElapsed(0);
      return;
    }
    setElapsed(Math.floor((Date.now() - state.startTime) / 1000));
    if (!state.isRecording) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - state.startTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [state?.startTime, state?.isRecording]);

  const handleClick = useCallback(() => {
    api?.floating?.focusMain?.();
  }, [api]);

  const handleDismiss = useCallback(() => {
    api?.floating?.userDismiss?.();
  }, [api]);

  if (!state) {
    return (
      <div
        style={
          {
            width: "100%",
            height: "100%",
            WebkitAppRegion: "drag",
          } as React.CSSProperties
        }
      />
    );
  }

  return (
    <div
      style={
        {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          WebkitAppRegion: "drag",
        } as React.CSSProperties
      }
    >
      <MeetingIndicatorPill
        title={state.title || "Recording"}
        isRecording={state.isRecording}
        elapsedSeconds={elapsed}
        onPillClick={handleClick}
        onDismiss={handleDismiss}
        pillStyleExtra={{ WebkitAppRegion: "no-drag" }}
      />
    </div>
  );
}
