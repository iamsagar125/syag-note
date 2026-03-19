import { cn } from "@/lib/utils";
import { Eye, EyeOff, BarChart3 } from "lucide-react";

type ViewMode = "my-notes" | "ai-notes" | "coaching";

interface NotesViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  transcriptVisible?: boolean;
  onToggleTranscript?: () => void;
  showCoaching?: boolean;
}

const segmentClass = (
  active: boolean
) => cn(
  "flex items-center justify-center p-2 transition-colors",
  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
);

export function NotesViewToggle({ viewMode, onViewModeChange, transcriptVisible, onToggleTranscript, showCoaching }: NotesViewToggleProps) {
  return (
    <div className="flex items-center rounded-full border border-border bg-card overflow-hidden">
      {/* My Notes */}
      <button
        onClick={() => onViewModeChange("my-notes")}
        className={segmentClass(viewMode === "my-notes")}
        title="My notes only"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="3" width="12" height="1.5" rx="0.75" />
          <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
          <rect x="2" y="11.5" width="12" height="1.5" rx="0.75" />
        </svg>
      </button>

      {/* Summary (AI notes) */}
      <button
        onClick={() => onViewModeChange("ai-notes")}
        className={segmentClass(viewMode === "ai-notes")}
        title="AI notes + my notes"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1l1.3 3.7L13 6l-3.7 1.3L8 11l-1.3-3.7L3 6l3.7-1.3L8 1z" />
          <path d="M12 9l.7 2L15 12l-2.3.7-.7 2-.7-2L9 12l2.3-.7.7-2z" />
        </svg>
      </button>

      {/* Transcript visibility (eye) — after Summary */}
      {onToggleTranscript && (
        <button
          onClick={onToggleTranscript}
          className={segmentClass(!!transcriptVisible)}
          title={transcriptVisible ? "Hide transcript" : "Show transcript"}
        >
          {transcriptVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}

      {/* Coaching (bar chart) */}
      {showCoaching && (
        <button
          onClick={() => onViewModeChange("coaching")}
          className={segmentClass(viewMode === "coaching")}
          title="Speech coaching"
        >
          <BarChart3 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
