import { useRecording } from "@/contexts/RecordingContext";
import { useNavigate, useLocation } from "react-router-dom";
import { X, EyeOff } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { loadPreferences } from "@/pages/SettingsPage";

const POSITION_LS_KEY = "syag-indicator-y";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function loadYPercent(): number {
  try {
    const v = localStorage.getItem(POSITION_LS_KEY);
    if (v) return Math.min(90, Math.max(10, parseFloat(v)));
  } catch {}
  return 50;
}

export function LiveMeetingIndicator() {
  const { activeSession, clearSession } = useRecording();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // Only show after returning from a minimized/backgrounded tab
  const [showAfterReturn, setShowAfterReturn] = useState(false);
  const [manuallyHidden, setManuallyHidden] = useState(false);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state
  const [yPercent, setYPercent] = useState(loadYPercent);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartPercent = useRef(0);
  const didDrag = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tick elapsed time
  useEffect(() => {
    if (!activeSession?.isRecording) return;
    setElapsed(activeSession.elapsedSeconds);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [activeSession?.isRecording, activeSession?.elapsedSeconds]);

  // Listen for page visibility changes — show indicator when returning from background
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && activeSession?.isRecording) {
        setShowAfterReturn(true);
        setManuallyHidden(false);
      } else if (document.visibilityState === "hidden") {
        // Reset when leaving so it triggers again on return
        setShowAfterReturn(false);
        setExpanded(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [activeSession?.isRecording]);

  // Reset when session changes
  useEffect(() => {
    setManuallyHidden(false);
    setShowAfterReturn(false);
  }, [activeSession?.noteId]);

  // Hide when user navigates within the app (they're actively using it)
  useEffect(() => {
    setShowAfterReturn(false);
    setExpanded(false);
  }, [location.pathname]);

  const scheduleCollapse = useCallback(() => {
    collapseTimer.current = setTimeout(() => setExpanded(false), 3000);
  }, []);

  const cancelCollapse = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  // Click-to-toggle expand (fallback for touch)
  const handleClick = useCallback(() => {
    if (didDrag.current) return;
    if (!expanded) {
      cancelCollapse();
      setExpanded(true);
    } else {
      // When expanded, clicking the main area navigates to the session
      navigate(`/new-note?session=${activeSession?.noteId}`);
    }
  }, [expanded, activeSession?.noteId, navigate, cancelCollapse]);

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    didDrag.current = false;
    dragStartY.current = e.clientY;
    dragStartPercent.current = yPercent;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [yPercent]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientY - dragStartY.current;
    if (Math.abs(delta) > 3) didDrag.current = true;
    const windowH = window.innerHeight;
    const deltaPercent = (delta / windowH) * 100;
    const next = Math.min(90, Math.max(10, dragStartPercent.current + deltaPercent));
    setYPercent(next);
  }, []);

  const onPointerUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      localStorage.setItem(POSITION_LS_KEY, String(yPercent));
    }
  }, [yPercent]);

  const prefs = loadPreferences();

  // Only show when: active session, not on recording page, prefs enabled,
  // not manually hidden, AND user just returned from background
  if (
    !activeSession ||
    location.pathname === "/new-note" ||
    !prefs.showRecordingIndicator ||
    manuallyHidden ||
    !showAfterReturn
  ) return null;

  return (
    <>
      <style>{`
        @keyframes indicator-pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>

      <div
        ref={containerRef}
        className="fixed right-0 z-[9999] flex items-center"
        style={{
          top: `${yPercent}%`,
          transform: expanded
            ? "translateX(0) translateY(-50%)"
            : "translateX(50%) translateY(-50%)",
          transition: isDragging.current
            ? "transform 0.4s cubic-bezier(0.4,0,0.2,1)"
            : "transform 0.4s cubic-bezier(0.4,0,0.2,1), top 0.15s ease-out",
          cursor: isDragging.current ? "grabbing" : "grab",
          touchAction: "none",
          userSelect: "none",
        }}
        onMouseEnter={() => {
          if (!isDragging.current) { cancelCollapse(); setExpanded(true); }
        }}
        onMouseLeave={() => {
          if (!isDragging.current) scheduleCollapse();
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="flex items-center rounded-l-2xl overflow-hidden"
          style={{
            width: expanded ? 260 : 44,
            height: 44,
            background: "hsl(var(--foreground) / 0.93)",
            backdropFilter: "blur(12px)",
            transition: "width 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
          onClick={handleClick}
        >
          {/* Favicon circle with pulse ring */}
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 44, height: 44 }}>
            <span
              className="absolute inset-0 rounded-full border-2 border-accent"
              style={{ animation: "indicator-pulse-ring 2s cubic-bezier(0,0,0.2,1) infinite" }}
            />
            <img src="/favicon.png" alt="Syag" className="w-7 h-7 rounded-full object-cover relative z-10" />
          </div>

          {/* Expanded content */}
          <div
            className="flex items-center gap-2 pr-2 overflow-hidden"
            style={{
              opacity: expanded ? 1 : 0,
              transition: "opacity 0.2s ease 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="text-xs font-medium text-background truncate max-w-[120px]">
                {activeSession.title || "Untitled"}
              </span>
              <span className="text-[10px] text-background/60 font-mono">
                {formatTime(elapsed)}
              </span>
            </div>
            {/* Hide button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setManuallyHidden(true);
              }}
              className="rounded-full p-1 text-background/40 hover:text-background/70 transition-colors flex-shrink-0"
              title="Hide indicator"
            >
              <EyeOff className="h-3 w-3" />
            </button>
            {/* Stop / dismiss */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearSession();
              }}
              className="rounded-full p-1 text-background/50 hover:text-background transition-colors flex-shrink-0"
              title="Stop recording"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
