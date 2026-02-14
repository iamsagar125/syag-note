import { Clock, Users } from "lucide-react";
import type { Meeting } from "@/data/meetings";
import { cn } from "@/lib/utils";

interface MeetingCardProps {
  meeting: Meeting;
  selected: boolean;
  onClick: () => void;
}

export function MeetingCard({ meeting, selected, onClick }: MeetingCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition-all animate-fade-in",
        selected
          ? "border-primary/30 bg-card shadow-sm"
          : "border-transparent bg-transparent hover:border-border hover:bg-card/60"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{meeting.date}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-xs text-muted-foreground">{meeting.time}</span>
      </div>

      <h3 className="font-display text-base font-semibold text-foreground leading-snug">
        {meeting.title}
      </h3>

      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
        {meeting.summary}
      </p>

      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {meeting.duration}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          {meeting.participants.length}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {meeting.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-sage-light px-2.5 py-0.5 text-[11px] font-medium text-accent"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}
