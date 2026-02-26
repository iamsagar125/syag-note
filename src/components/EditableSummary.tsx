import { useState, useEffect } from "react";
import {
  CheckCircle2, Circle, Pencil, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

type BulletWithSub = { text: string; subBullets?: string[] };

function parseBulletsWithSub(text: string): BulletWithSub[] {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const result: BulletWithSub[] = [];
  for (const line of lines) {
    if (/^\s{2,}-\s+/.test(line) || (line.startsWith("  - ") && !line.startsWith("    "))) {
      const sub = line.replace(/^\s*-\s*/, "").trim();
      if (result.length > 0 && sub) {
        const last = result[result.length - 1];
        last.subBullets = last.subBullets || [];
        last.subBullets.push(sub);
      }
    } else if (/^-\s+/.test(line)) {
      result.push({ text: line.replace(/^-\s*/, "").trim() });
    }
  }
  return result;
}

function serializeBullets(bullets: BulletWithSub[]): string {
  return bullets
    .map((b) => {
      if (b.subBullets?.length) {
        return `- ${b.text}\n${b.subBullets.map((s) => `  - ${s}`).join("\n")}`;
      }
      return `- ${b.text}`;
    })
    .join("\n");
}

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

export function EditableSummary({ summary, onUpdate }: EditableSummaryProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localSummary, setLocalSummary] = useState<SummaryData>(summary);
  useEffect(() => {
    setLocalSummary(summary);
  }, [summary]);

  const commit = (updated: SummaryData) => {
    setLocalSummary(updated);
    onUpdate?.(updated);
    setEditingField(null);
  };

  const handleOverviewChange = (value: string) => {
    commit({ ...localSummary, overview: value });
  };

  const handleTopicTitleChange = (topicIndex: number, value: string) => {
    const next = [...(localSummary.discussionTopics || [])];
    if (next[topicIndex]) next[topicIndex] = { ...next[topicIndex], topic: value };
    commit({ ...localSummary, discussionTopics: next });
  };

  const handleTopicSummaryChange = (topicIndex: number, bullets: BulletWithSub[]) => {
    const next = [...(localSummary.discussionTopics || [])];
    if (next[topicIndex]) next[topicIndex] = { ...next[topicIndex], summary: serializeBullets(bullets) };
    commit({ ...localSummary, discussionTopics: next });
  };

  const handleKeyPointChange = (index: number, value: string) => {
    const next = [...(localSummary.keyPoints || [])];
    next[index] = value;
    commit({ ...localSummary, keyPoints: next });
  };

  const handleDecisionChange = (index: number, value: string) => {
    const next = [...(localSummary.decisions || [])];
    next[index] = value;
    commit({ ...localSummary, decisions: next });
  };

  const handleActionTextChange = (rawIndex: number, value: string) => {
    const items = [...(localSummary.actionItems || localSummary.nextSteps || [])];
    if (items[rawIndex]) items[rawIndex] = { ...items[rawIndex], text: value };
    const updated = localSummary.actionItems
      ? { ...localSummary, actionItems: items as ActionItem[] }
      : { ...localSummary, nextSteps: items };
    setLocalSummary(updated);
    onUpdate?.(updated);
    setEditingField(null);
  };

  const handleToggleActionDone = (rawIndex: number) => {
    const items = [...(localSummary.actionItems || localSummary.nextSteps || [])];
    items[rawIndex] = { ...items[rawIndex], done: !items[rawIndex].done };
    const updated = localSummary.actionItems
      ? { ...localSummary, actionItems: items as ActionItem[] }
      : { ...localSummary, nextSteps: items };
    setLocalSummary(updated);
    onUpdate?.(updated);
  };

  const rawActions = localSummary.actionItems || localSummary.nextSteps?.map((s) => ({
    ...s,
    priority: "medium" as const,
    dueDate: undefined,
  })) || [];
  const actionsWithIndices = rawActions.map((a, i) => ({ item: a, rawIndex: i }));
  const actions = actionsWithIndices.map((x) => x.item);
  const topics = localSummary.discussionTopics || [];
  const keyPoints = localSummary.keyPoints || [];
  const decisions = localSummary.decisions || [];
  const quotes = localSummary.keyQuotes || [];
  const attendees = localSummary.attendees || [];

  return (
    <div className="animate-fade-in space-y-4">
      {attendees.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Users className="h-3 w-3 text-muted-foreground/40" />
          {attendees.map((a, i) => (
            <span key={i} className="text-[13px] font-medium text-foreground/80">{a}{i < attendees.length - 1 ? "," : ""}</span>
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
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed font-medium text-foreground focus:outline-none"
              rows={2}
            />
          ) : (
            <p
              onClick={() => setEditingField("overview")}
              className="text-[15px] leading-relaxed font-medium text-foreground cursor-text hover:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
            >
              {localSummary.overview}
              <Pencil className="inline-block ml-1 h-2.5 w-2.5 text-muted-foreground/0 group-hover/section:text-muted-foreground/30 transition-colors" />
            </p>
          )}
        </div>
      )}

      {topics.map((topic, i) => {
        const bullets = parseBulletsWithSub(topic.summary);
        if (bullets.length === 0) return null;
        return (
          <div key={i} className="group/section">
            {editingField === `topic-title-${i}` ? (
              <input
                autoFocus
                defaultValue={topic.topic}
                onBlur={(e) => {
                  handleTopicTitleChange(i, e.target.value);
                  setEditingField(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTopicTitleChange(i, (e.target as HTMLInputElement).value);
                    setEditingField(null);
                  }
                  if (e.key === "Escape") setEditingField(null);
                }}
                className="text-[15px] font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 w-full mb-1"
              />
            ) : (
              <h3
                onClick={() => setEditingField(`topic-title-${i}`)}
                className="text-[15px] font-semibold text-foreground mb-1 cursor-text hover:bg-secondary/30 rounded px-1 -mx-1 transition-colors"
              >
                {topic.topic}
                <Pencil className="inline-block ml-1 h-2.5 w-2.5 text-muted-foreground/0 group-hover/section:text-muted-foreground/30" />
              </h3>
            )}
            <ul className="space-y-0.5">
              {bullets.map((bullet, j) => (
                <li key={j} className="text-[15px] leading-snug">
                  <div className="flex gap-1.5">
                    <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-foreground/15" />
                    {editingField === `topic-${i}-bullet-${j}` ? (
                      <input
                        autoFocus
                        defaultValue={bullet.text}
                        onBlur={(e) => {
                          const next = [...bullets];
                          next[j] = { ...next[j], text: e.target.value };
                          handleTopicSummaryChange(i, next);
                          setEditingField(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const next = [...bullets];
                            next[j] = { ...next[j], text: (e.target as HTMLInputElement).value };
                            handleTopicSummaryChange(i, next);
                            setEditingField(null);
                          }
                          if (e.key === "Escape") setEditingField(null);
                        }}
                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 font-medium text-foreground/90"
                      />
                    ) : (
                      <span
                        onClick={() => setEditingField(`topic-${i}-bullet-${j}`)}
                        className="font-medium text-foreground/90 cursor-text hover:bg-secondary/30 rounded px-1 -mx-1"
                      >
                        {bullet.text}
                      </span>
                    )}
                  </div>
                  {bullet.subBullets && bullet.subBullets.length > 0 && (
                    <ul className="pl-6 mt-0.5 space-y-0.5">
                      {bullet.subBullets.map((sub, k) => (
                        <li key={k} className="flex gap-1.5">
                          <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-foreground/10" />
                          {editingField === `topic-${i}-bullet-${j}-sub-${k}` ? (
                            <input
                              autoFocus
                              defaultValue={sub}
                              onBlur={(e) => {
                                const next = [...bullets];
                                next[j] = {
                                  ...next[j],
                                  subBullets: [...(next[j].subBullets || [])],
                                };
                                next[j].subBullets![k] = e.target.value;
                                handleTopicSummaryChange(i, next);
                                setEditingField(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const next = [...bullets];
                                  next[j] = {
                                    ...next[j],
                                    subBullets: [...(next[j].subBullets || [])],
                                  };
                                  next[j].subBullets![k] = (e.target as HTMLInputElement).value;
                                  handleTopicSummaryChange(i, next);
                                  setEditingField(null);
                                }
                                if (e.key === "Escape") setEditingField(null);
                              }}
                              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[14px] text-foreground/80"
                            />
                          ) : (
                            <span
                              onClick={() => setEditingField(`topic-${i}-bullet-${j}-sub-${k}`)}
                              className="text-[14px] text-foreground/80 cursor-text hover:bg-secondary/30 rounded px-1 -mx-1"
                            >
                              {sub}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {decisions.length > 0 && (
        <div className="group/section">
          <h3 className="text-[15px] font-semibold text-foreground mb-1">Decisions</h3>
          <ul className="space-y-0.5">
            {decisions.map((d, i) => (
              <li key={i} className="flex gap-1.5 text-[15px] font-medium text-foreground/90 leading-snug">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
                {editingField === `decision-${i}` ? (
                  <input
                    autoFocus
                    defaultValue={d}
                    onBlur={(e) => {
                      handleDecisionChange(i, e.target.value);
                      setEditingField(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleDecisionChange(i, (e.target as HTMLInputElement).value);
                        setEditingField(null);
                      }
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    className="flex-1 bg-transparent border-none outline-none focus:ring-0"
                  />
                ) : (
                  <span
                    onClick={() => setEditingField(`decision-${i}`)}
                    className="cursor-text hover:bg-secondary/30 rounded px-1 -mx-1"
                  >
                    {d}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {keyPoints.length > 0 && topics.length === 0 && (
        <div className="group/section">
          <h3 className="text-[15px] font-semibold text-foreground mb-1">Key Points</h3>
          <ul className="space-y-0.5">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex gap-1.5 text-[15px] font-medium text-foreground/90 leading-snug">
                <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-foreground/15" />
                {editingField === `keypoint-${i}` ? (
                  <input
                    autoFocus
                    defaultValue={point}
                    onBlur={(e) => {
                      handleKeyPointChange(i, e.target.value);
                      setEditingField(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleKeyPointChange(i, (e.target as HTMLInputElement).value);
                        setEditingField(null);
                      }
                      if (e.key === "Escape") setEditingField(null);
                    }}
                    className="flex-1 bg-transparent border-none outline-none focus:ring-0"
                  />
                ) : (
                  <span
                    onClick={() => setEditingField(`keypoint-${i}`)}
                    className="cursor-text hover:bg-secondary/30 rounded px-1 -mx-1"
                  >
                    {point}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions.length > 0 && (
        <div>
          <h3 className="text-[15px] font-semibold text-foreground mb-1.5">Action items</h3>
          <div className="space-y-1">
            {actionsWithIndices.map(({ item, rawIndex }, i) => {
              const displayText = (() => {
                const hasAssignee = item.assignee && !["You", "Unassigned", "[Unassigned]", "TBD", ""].includes(item.assignee.trim());
                const base = hasAssignee ? `${item.assignee} - ${item.text}` : item.text;
                const due = "dueDate" in item && item.dueDate ? ` (by ${item.dueDate})` : "";
                return base + due;
              })();
              return (
                <div key={i} className="flex items-start gap-1.5 text-[15px] font-medium leading-snug group/action">
                  <span className="flex-shrink-0 w-5 text-muted-foreground">{i + 1}.</span>
                  <button onClick={() => handleToggleActionDone(rawIndex)} className="mt-0.5 flex-shrink-0">
                    {item.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-foreground/20 hover:text-foreground/40 transition-colors" />
                    )}
                  </button>
                  {editingField === `action-${i}` ? (
                    <input
                      autoFocus
                      defaultValue={item.text}
                      onBlur={(e) => {
                        handleActionTextChange(rawIndex, e.target.value);
                        setEditingField(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleActionTextChange(rawIndex, (e.target as HTMLInputElement).value);
                          setEditingField(null);
                        }
                        if (e.key === "Escape") setEditingField(null);
                      }}
                      className={cn(
                        "flex-1 bg-transparent border-none outline-none focus:ring-0 min-w-0",
                        item.done && "text-muted-foreground/60 line-through"
                      )}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingField(`action-${i}`)}
                      className={cn(
                        "cursor-text hover:bg-secondary/30 rounded px-1 -mx-1",
                        item.done ? "text-muted-foreground/60 line-through" : "text-foreground/90"
                      )}
                    >
                      {displayText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {quotes.length > 0 && (
        <div className="pt-1">
          {quotes.map((q, i) => (
            <blockquote key={i} className="border-l-2 border-accent/20 pl-2.5 py-0.5">
              <p className="text-[14px] italic font-medium text-foreground/80">"{q.text}"</p>
              <p className="text-[12px] text-muted-foreground/70">— {q.speaker}</p>
            </blockquote>
          ))}
        </div>
      )}
    </div>
  );
}
