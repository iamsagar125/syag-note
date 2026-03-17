/**
 * Compact commitments card for the Morning Brief dashboard sidebar.
 * Shows top 3 open commitments with overdue highlighting.
 */
import { useState, useEffect, useCallback } from "react"
import { getElectronAPI } from "@/lib/electron-api"
import { useNavigate } from "react-router-dom"
import { Circle, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { isPast, parseISO, isValid } from "date-fns"

interface Commitment {
  id: string
  note_id: string
  text: string
  owner: string
  due_date?: string
  status: string
}

export function CompactCommitmentsCard() {
  const navigate = useNavigate()
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const api = getElectronAPI()

  const loadCommitments = useCallback(async () => {
    if (!api?.memory) return
    try {
      const result = await api.memory.commitments.getOpen()
      setCommitments((result || []).slice(0, 3))
    } catch {}
  }, [api])

  useEffect(() => {
    loadCommitments()
  }, [loadCommitments])

  const handleToggle = useCallback(async (id: string) => {
    if (!api?.memory) return
    try {
      await api.memory.commitments.updateStatus(id, "completed")
      loadCommitments()
    } catch {}
  }, [api, loadCommitments])

  if (commitments.length === 0) return null

  const overdueCount = commitments.filter(c => {
    if (!c.due_date) return false
    try {
      const d = parseISO(c.due_date)
      return isValid(d) && isPast(d)
    } catch { return false }
  }).length

  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Commitments</span>
          {overdueCount > 0 && (
            <span className="text-[10px] font-medium text-red-500">{overdueCount} overdue</span>
          )}
        </div>
        <button
          onClick={() => navigate("/commitments")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-1.5">
        {commitments.map(c => {
          const isOverdue = c.due_date && (() => {
            try {
              const d = parseISO(c.due_date!)
              return isValid(d) && isPast(d)
            } catch { return false }
          })()

          return (
            <div key={c.id} className="flex items-start gap-2">
              <button
                onClick={() => handleToggle(c.id)}
                className={cn(
                  "mt-0.5 flex-shrink-0 transition-colors",
                  isOverdue ? "text-red-500" : "text-muted-foreground/40 hover:text-primary"
                )}
              >
                {isOverdue ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </button>
              <p className={cn(
                "text-xs leading-snug truncate",
                isOverdue ? "text-foreground font-medium" : "text-muted-foreground"
              )}>
                {c.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
