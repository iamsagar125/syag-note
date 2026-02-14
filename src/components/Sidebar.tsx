import { Calendar, FileText, Home, Search, Settings, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", active: true },
  { icon: FileText, label: "All Notes", active: false },
  { icon: Calendar, label: "Calendar", active: false },
  { icon: Sparkles, label: "Ask Granola", active: false },
  { icon: Settings, label: "Settings", active: false },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar p-4">
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-xl font-semibold text-foreground">Granola</span>
      </div>

      <button className="mb-6 flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
        <Plus className="h-4 w-4" />
        New Meeting
      </button>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search notes..."
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              item.active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-border bg-sage-light p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium text-foreground">AI Enhanced</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Your notes are automatically summarized with AI.
        </p>
      </div>
    </aside>
  );
}
