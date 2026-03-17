/**
 * Live Coaching Overlay
 *
 * Displays real-time speech metrics during recording.
 * Compact HUD at the bottom of the recording page.
 * Toggle-able -- user can show/hide.
 */

import { useMemo } from "react"
import { Activity, MessageCircle, Volume2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { computeLiveMetrics, type TranscriptLine } from "@/lib/live-coach"

interface LiveCoachOverlayProps {
  transcriptLines: TranscriptLine[]
  visible: boolean
  onToggle: () => void
}

export function LiveCoachOverlay({ transcriptLines, visible, onToggle }: LiveCoachOverlayProps) {
  const metrics = useMemo(
    () => computeLiveMetrics(transcriptLines),
    [transcriptLines]
  )

  if (!visible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-20 right-4 z-40 rounded-full bg-card/80 backdrop-blur-sm border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-all shadow-sm"
        title="Show live coaching"
      >
        <Activity className="h-3.5 w-3.5" />
      </button>
    )
  }

  const wpmColor = metrics.wpmStatus === 'good'
    ? 'text-emerald-500'
    : metrics.wpmStatus === 'fast'
      ? 'text-amber-500'
      : 'text-blue-400'

  const talkColor = metrics.talkStatus === 'balanced'
    ? 'text-emerald-500'
    : metrics.talkStatus === 'dominant'
      ? 'text-amber-500'
      : 'text-blue-400'

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
      {/* Nudge banner */}
      {metrics.nudge && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary backdrop-blur-sm shadow-sm animate-in slide-in-from-right-2 duration-300">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{metrics.nudge}</span>
        </div>
      )}

      {/* Metrics bar */}
      <div className="flex items-center gap-3 rounded-lg bg-card/90 backdrop-blur-sm border border-border px-3 py-2 shadow-sm">
        {/* WPM */}
        <div className="flex items-center gap-1.5" title="Words per minute">
          <Volume2 className={cn("h-3 w-3", wpmColor)} />
          <span className={cn("text-xs font-mono tabular-nums font-medium", wpmColor)}>
            {metrics.wpm > 0 ? metrics.wpm : '--'}
          </span>
          <span className="text-[10px] text-muted-foreground">wpm</span>
        </div>

        <div className="w-px h-3 bg-border" />

        {/* Talk ratio */}
        <div className="flex items-center gap-1.5" title="Talk-to-listen ratio">
          <MessageCircle className={cn("h-3 w-3", talkColor)} />
          <span className={cn("text-xs font-mono tabular-nums font-medium", talkColor)}>
            {Math.round(metrics.talkRatio * 100)}%
          </span>
          <span className="text-[10px] text-muted-foreground">talk</span>
        </div>

        <div className="w-px h-3 bg-border" />

        {/* Fillers */}
        <div className="flex items-center gap-1.5" title={`${metrics.fillerCount} filler words (${metrics.fillersPerMinute}/min)`}>
          <span className={cn(
            "text-xs font-mono tabular-nums font-medium",
            metrics.fillersPerMinute > 3 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {metrics.fillerCount}
          </span>
          <span className="text-[10px] text-muted-foreground">fillers</span>
        </div>

        {/* Close button */}
        <button
          onClick={onToggle}
          className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Hide live coaching"
        >
          <Activity className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
