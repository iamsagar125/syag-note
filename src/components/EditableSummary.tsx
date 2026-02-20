import { useState } from "react";
import {
  CheckCircle2, Circle, Pencil, Quote, AlertCircle,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscussionTopic {
  topic: string;
  summary: string;
  speakers: string[];
}

interface ActionItem {
  text: string;
  assignee: string;
  dueDate?: string;
  priority: "high" | "medium" | "low";
  done: boolean;
}

interface KeyQuote {
  speaker: string;
  text: string;
}

export interface SummaryData {
  title?: string;
  meetingType?: string;
  attendees?: string[];
  overview: string;
  decisions?: string[];
  discussionTopics?: DiscussionTopic[];
  keyPoints?: string[];
  actionItems?: ActionItem[];
  nextSteps?: { text: string; assignee: string; done: boolean }[];
  questionsAndOpenItems?: string[];
  followUps?: string[];
  keyQuotes?: KeyQuote[];
}

interface EditableSummaryProps {
  summary: SummaryData;
  onUpdate?: (summary: SummaryData) => void;
}

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map(l => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

const priorityDot = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-green-500",
};

export function EditableSummary({ summary, onUpdate }: EditableSummaryProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localSummary, setLocalSummary] = useState<SummaryData>(summary);

  const commit = (updated: SummaryData) => {
    setLocalSummary(updated);
    onUpdate?.(updated);
    setEditingField(null);
  };

  const handleOverviewChange = (value: string) => {
    commit({ ...localSummary, overview: value });
  };

  const handleToggleActionDone = (index: number) => {
    const items = [...(localSummary.actionItems || localSummary.nextSteps || [])];
    items[index] = { ...items[index], done: !items[index].done };
    const updated = localSummary.actionItems
      ? { ...localSummary, actionItems: items as ActionItem[] }
      : { ...localSummary, nextSteps: items };
    setLocalSummary(updated);
    onUpdate?.(updated);
  };

  const actions = localSummary.actionItems || localSummary.nextSteps?.map(s => ({
    ...s, priority: "medium" as const, dueDate: undefined,
  })) || [];
  const topics = localSummary.discussionTopics || [];
  const keyPoints = localSummary.keyPoints || [];
  const questions = localSummary.questionsAndOpenItems || [];
  const quotes = localSummary.keyQuotes || [];
  const attendees = localSummary.attendees || [];

  return (
    <div className="animate-fade-in space-y-5">
      {/* Attendees — subtle inline chips */}
      {attendees.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Users className="h-3.5 w-3.5 text-muted-foreground/50" />
          {attendees.map((a, i) => (
            <span
              key={i}
              className="inline-flex items-center rounded-full bg-secondary/70 px-2 py-0.5 text-[11px] font-medium text-foreground/60"
            >
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Overview — single line of context */}
      {localSummary.overview && (
        <div className="group/section">
          {editingField === "overview" ? (
            <textarea
              autoFocus
              defaultValue={localSummary.overview}
              onBlur={(e) => handleOverviewChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleOverviewChange((e.target as HTMLTextAreaElement).value);
                }
                if (e.key === "Escape") setEditingField(null);
              }}
              className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-foreground/50 focus:outline-none"
              rows={2}
            />
          ) : (
            <p
              onClick={() => setEditingField("overview")}
              className="text-[14px] leading-relaxed text-foreground/50 cursor-text hover:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
            >
              {localSummary.overview}
              <Pencil className="inline-block ml-1.5 h-2.5 w-2.5 text-muted-foreground/0 group-hover/section:text-muted-foreground/30 transition-colors" />
            </p>
          )}
        </div>
      )}

      {/* ── Topics: the core of the notes ── */}
      {topics.map((topic, i) => {
        const bullets = parseBullets(topic.summary);
        return (
          <div key={i}>
            <h2 className="font-display text-[15px] font-semibold text-foreground/80 mb-1.5">
              {topic.topic}
            </h2>
            <ul className="space-y-1 pl-0.5">
              {bullets.map((bullet, j) => {
                const isDecision = /^Decision:\s*/i.test(bullet);
                const displayText = bullet.replace(/^Decision:\s*/i, "");
                return (
                  <li key={j} className="flex gap-2 text-[14px] leading-relaxed">
                    <span className={cn(
                      "mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full",
                      isDecision ? "bg-accent" : "bg-foreground/20"
                    )} />
                    <span className={cn(
                      isDecision
                        ? "text-foreground/80 font-medium"
                        : "text-foreground/65"
                    )}>
                      {isDecision && (
                        <span className="text-accent font-medium mr-1">Decision:</span>
                      )}
                      {displayText}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {/* Key Points — backward compat for old summaries */}
      {keyPoints.length > 0 && topics.length === 0 && (
        <div>
          <h2 className="font-display text-[15px] font-semibold text-foreground/80 mb-1.5">
            Key Points
          </h2>
          <ul className="space-y-1 pl-0.5">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex gap-2 text-[14px] text-foreground/65 leading-relaxed">
                <span className="mt-[9px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-foreground/20" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Action Items ── */}
      {actions.length > 0 && (
        <div>
          <h2 className="font-display text-[15px] font-semibold text-foreground/80 mb-2">
            Action Items
          </h2>
          <div className="space-y-1.5 pl-0.5">
            {actions.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-[14px] leading-relaxed group/action">
                <button onClick={() => handleToggleActionDone(i)} className="mt-0.5 flex-shrink-0">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  ) : (
                    <Circle className="h-4 w-4 text-foreground/25 hover:text-foreground/45 transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap">
                  <span className={cn(
                    item.done ? "text-muted-foreground line-through" : "text-foreground/70"
                  )}>
                    {item.text}
                  </span>
                  {item.assignee && (
                    <span className="text-[11px] text-muted-foreground/70 font-medium">
                      — {item.assignee}
                    </span>
                  )}
                  {"priority" in item && item.priority && (
                    <span className={cn(
                      "inline-block mt-px h-1.5 w-1.5 rounded-full flex-shrink-0",
                      priorityDot[item.priority as keyof typeof priorityDot] || priorityDot.medium
                    )} />
                  )}
                  {item.dueDate && (
                    <span className="text-[11px] text-muted-foreground/60">{item.dueDate}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Questions */}
      {questions.length > 0 && (
        <div>
          <h2 className="font-display text-[15px] font-semibold text-foreground/80 mb-1.5">
            Open Questions
          </h2>
          <ul className="space-y-1 pl-0.5">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-2 text-[14px] text-foreground/65 leading-relaxed">
                <AlertCircle className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-amber-500/70" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Quotes — only if present */}
      {quotes.length > 0 && (
        <div>
          <h2 className="font-display text-[15px] font-semibold text-foreground/80 mb-2">
            Notable
          </h2>
          <div className="space-y-2 pl-0.5">
            {quotes.map((q, i) => (
              <blockquote key={i} className="border-l-2 border-accent/25 pl-3 py-0.5">
                <p className="text-[13px] italic text-foreground/55 leading-relaxed">"{q.text}"</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">— {q.speaker}</p>
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
