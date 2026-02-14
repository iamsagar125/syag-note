import { Calendar, Clock, Users, CheckCircle2, Circle, Sparkles, Share2, MoreHorizontal } from "lucide-react";
import type { Meeting } from "@/data/meetings";

interface MeetingDetailProps {
  meeting: Meeting;
}

export function MeetingDetail({ meeting }: MeetingDetailProps) {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {meeting.date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {meeting.time} · {meeting.duration}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground leading-tight">
            {meeting.title}
          </h1>
          <div className="mt-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {meeting.participants.join(", ")}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Share2 className="h-4 w-4" />
          </button>
          <button className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* AI Summary */}
      <div className="mb-8 rounded-xl border border-accent/20 bg-sage-light p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">AI Summary</span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">{meeting.summary}</p>
      </div>

      {/* Key Points */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Key Points</h2>
        <ul className="space-y-2.5">
          {meeting.keyPoints.map((point, i) => (
            <li key={i} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Action Items */}
      <div className="mb-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Action Items</h2>
        <div className="space-y-3">
          {meeting.actionItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-border"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className={`text-sm ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.text}
                </p>
                <span className="mt-1 text-xs text-muted-foreground">{item.assignee}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {meeting.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-sage-light px-3 py-1 text-xs font-medium text-accent"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
