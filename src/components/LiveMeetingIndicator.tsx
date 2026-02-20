import { useRecording } from "@/contexts/RecordingContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Square } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { loadPreferences } from "@/pages/SettingsPage";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LiveMeetingIndicator() {
  const { activeSession, clearSession, stopAudioCapture } = useRecording();
  const navigate = useNavigate();
  const location = useLocation();
  const [manuallyHidden, setManuallyHidden] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setManuallyHidden(false);
  }, [activeSession?.noteId]);

  useEffect(() => {
    if (activeSession && location.pathname !== "/new-note") {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [activeSession, location.pathname]);

  const handleClick = useCallback(() => {
    navigate(`/new-note?session=${activeSession?.noteId}`);
  }, [activeSession?.noteId, navigate]);

  const handleStop = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await stopAudioCapture();
    clearSession();
  }, [stopAudioCapture, clearSession]);

  const prefs = loadPreferences();

  // Only show when actively recording; hide when paused so it doesn't persist
  if (
    !activeSession ||
    !activeSession.isRecording ||
    location.pathname === "/new-note" ||
    !prefs.showRecordingIndicator ||
    manuallyHidden
  ) return null;

  return (
    <div
      className="fixed top-3 left-1/2 z-[9999]"
      style={{
        transform: visible
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(-20px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
      }}
    >
      <div
        onClick={handleClick}
        className="flex items-center gap-3 rounded-full px-4 py-2 cursor-pointer shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
        style={{
          background: "hsl(var(--foreground) / 0.92)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.2), 0 1px 6px rgba(0,0,0,0.1)",
        }}
      >
        {/* Recording dot (indicator only shows when actively recording) */}
        <div className="relative flex items-center justify-center">
          <span className="absolute h-3 w-3 rounded-full bg-red-500 animate-ping opacity-50" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
        </div>

        {/* Title */}
        <span className="text-[13px] font-medium text-background truncate max-w-[160px]">
          {activeSession.title || "Recording"}
        </span>

        {/* Timer */}
        <span className="text-[12px] font-mono text-background/60 tabular-nums">
          {formatTime(activeSession.elapsedSeconds)}
        </span>

        {/* End meeting button */}
        <button
          onClick={handleStop}
          className="flex items-center justify-center rounded-full h-6 w-6 bg-background/15 text-background/70 hover:bg-background/25 hover:text-background transition-colors flex-shrink-0"
          title="End meeting"
        >
          <Square className="h-2.5 w-2.5 fill-current" />
        </button>
      </div>
    </div>
  );
}
