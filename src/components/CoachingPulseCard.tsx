/**
 * Compact coaching sparkline card for the Morning Brief dashboard sidebar.
 * Shows latest coaching score + mini bar chart of recent scores.
 */
import { useMemo } from "react"
import { useNotes } from "@/contexts/NotesContext"
import { useNavigate } from "react-router-dom"
import { BarChart3, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

function scoreColor(score: number): string {
  if (score >= 80) return "bg-emerald-500"
  if (score >= 60) return "bg-amber-500"
  return "bg-red-500"
}

function scoreTextColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400"
  if (score >= 60) return "text-amber-600 dark:text-amber-400"
  return "text-red-500 dark:text-red-400"
}

export function CoachingPulseCard() {
  const { notes } = useNotes()
  const navigate = useNavigate()

  const recentScores = useMemo(() => {
    return notes
      .filter(n => n.coachingMetrics && n.coachingMetrics.overallScore > 0)
      .slice(0, 8)
      .map(n => n.coachingMetrics!.overallScore)
      .reverse()
  }, [notes])

  if (recentScores.length === 0) return null

  const latest = recentScores[recentScores.length - 1]
  const maxScore = Math.max(...recentScores, 100)

  return (
    <button
      onClick={() => navigate("/coaching")}
      className="w-full rounded-lg border border-border bg-card/50 p-3 text-left hover:bg-card transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Coaching</span>
        </div>
        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex items-end gap-3">
        <div>
          <span className={cn("text-2xl font-display tabular-nums", scoreTextColor(latest))}>
            {latest}
          </span>
          <span className="text-[10px] text-muted-foreground ml-1">/ 100</span>
        </div>

        {/* Mini sparkline bars */}
        <div className="flex items-end gap-[3px] h-6 flex-1 justify-end">
          {recentScores.map((score, i) => (
            <div
              key={i}
              className={cn("w-[6px] rounded-sm transition-all", scoreColor(score))}
              style={{ height: `${Math.max((score / maxScore) * 100, 12)}%` }}
              title={`Score: ${score}`}
            />
          ))}
        </div>
      </div>
    </button>
  )
}
