import { useState } from "react";
import {
  CheckCircle2, Circle, Pencil, AlertCircle, Users
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
    <div className="animate-fade-in space-y-4">
      {attendees.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Users className="h-3 w-3 text-muted-foreground/40" />
          {attendees.map((a, i) => (
            <span key={i} className="text-[11px] text-foreground/50">{a}{i < attendees.length - 1 ? "," : ""}</span>
          ))}
        </div>
      )}

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
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-foreground/45 focus:outline-none"
              rows={2}
            />
          ) : (
            <p
              onClick={() => setEditingField("overview")}
              className="text-[13px] leading-relaxed text-foreground/45 cursor-text hover:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
            >
              {localSummary.overview}
              <Pencil className="inline-block ml-1 h-2.5 w-2.5 text-muted-foreground/0 group-hover/section:text-muted-foreground/30 transition-colors" />
            </p>
          )}
        </div>
      )}

      {topics.map((topic, i) => {
        const bullets = parseBullets(topic.summary);
        if (bullets.length === 0) return null;
        return (
          <div key={i}>
            <h3 className="text-[13px] font-semibold text-foreground/75 mb-1">
              {topic.topic}
            </h3>
            <ul className="space-y-0.5">
              {bullets.map((bullet, j) => {
                const isDecision = /^Decision:\s*/i.test(bullet);
                const displayText = bullet.replace(/^Decision:\s*/i, "");
                return (
                  <li key={j} className="flex gap-1.5 text-[13px] leading-snug">
                    <span className={cn(
                      "mt-[7px] h-1 w-1 flex-shrink-0 rounded-full",
                      isDecision ? "bg-accent" : "bg-foreground/15"
                    )} />
                    <span className={cn(
                      "text-foreground/60",
                      isDecision && "font-medium text-foreground/75"
                    )}>
                      {isDecision && <span className="text-accent text-[11px] font-semibold mr-1">DECISION</span>}
                      {displayText}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {keyPoints.length > 0 && topics.length === 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-foreground/75 mb-1">Key Points</h3>
          <ul className="space-y-0.5">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex gap-1.5 text-[13px] text-foreground/60 leading-snug">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-foreground/15" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-foreground/75 mb-1.5">Action Items</h3>
          <div className="space-y-1">
            {actions.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[13px] leading-snug">
                <button onClick={() => handleToggleActionDone(i)} className="mt-0.5 flex-shrink-0">
                  {item.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-foreground/20 hover:text-foreground/40 transition-colors" />
                  )}
                </button>
                <span className={cn(
                  item.done ? "text-muted-foreground/50 line-through" : "text-foreground/60"
                )}>
                  {item.text}
                </span>
                {item.assignee && item.assignee !== "You" && (
                  <span className="text-[11px] text-muted-foreground/50 flex-shrink-0">— {item.assignee}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-foreground/75 mb-1">Open Questions</h3>
          <ul className="space-y-0.5">
            {questions.map((q, i) => (
              <li key={i} className="flex gap-1.5 text-[13px] text-foreground/55 leading-snug">
                <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500/60" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {quotes.length > 0 && (
        <div className="pt-1">
          {quotes.map((q, i) => (
            <blockquote key={i} className="border-l-2 border-accent/20 pl-2.5 py-0.5">
              <p className="text-[12px] italic text-foreground/40">"{q.text}"</p>
              <p className="text-[11px] text-muted-foreground/50">— {q.speaker}</p>
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}
