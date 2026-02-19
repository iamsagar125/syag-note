import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowUp, Mic, Paperclip, ChevronDown, LayoutGrid } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useModelSettings } from "@/contexts/ModelSettingsContext";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const recipes = [
  { label: "Streamline my calendar", color: "bg-blue-400/70" },
  { label: "List recent todos", color: "bg-emerald-400/70" },
  { label: "Coach me", color: "bg-amber-400/70" },
  { label: "Write weekly recap", color: "bg-orange-400/70" },
  { label: "Blind spots", color: "bg-lime-500/70" },
];

type Scope = "My notes" | "All meetings";

export default function AskSyag() {
  const { getActiveAIModelLabel } = useModelSettings();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scope, setScope] = useState<Scope>("My notes");
  const [showScopeMenu, setShowScopeMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = (text?: string) => {
    const question = text || input.trim();
    if (!question) return;
    setInput("");
    const modelLabel = getActiveAIModelLabel();

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setIsLoading(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `[${modelLabel}] Here's what I found across your notes: Simulated response to "${question}".`,
        },
      ]);
      setIsLoading(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col min-w-0">
        {/* Scrollable area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center px-6">
              {/* Title */}
              <h1 className="font-display text-2xl text-foreground mb-6">Ask anything about your notes</h1>

              {/* Input card */}
              <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-sm p-4 mb-5">
                {/* Scope row */}
                <div className="flex items-center gap-1.5 mb-3 relative">
                  <span className="text-sm font-medium text-foreground">{scope}</span>
                  <button
                    onClick={() => setShowScopeMenu(!showScopeMenu)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    {scope === "My notes" ? "All meetings" : "My notes"}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showScopeMenu && (
                    <div className="absolute top-full left-0 mt-1 rounded-lg border border-border bg-card shadow-lg py-1 z-10">
                      {(["My notes", "All meetings"] as Scope[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => { setScope(s); setShowScopeMenu(false); }}
                          className={cn(
                            "block w-full text-left px-4 py-1.5 text-sm transition-colors hover:bg-secondary",
                            s === scope ? "text-accent font-medium" : "text-foreground"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Input row */}
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type / for recipes"
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                  />
                  <span className="text-xs text-muted-foreground flex-shrink-0">Auto</span>
                  <button className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Mic className="h-4 w-4" />
                  </button>
                  {input.trim() && (
                    <button
                      onClick={() => handleSend()}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground transition-all hover:opacity-90 flex-shrink-0"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Recipe chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
                {recipes.map((r) => (
                  <button
                    key={r.label}
                    onClick={() => handleSend(r.label)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-all hover:shadow-sm hover:border-ring/20"
                  >
                    <span className={cn("h-2.5 w-1 rounded-full", r.color)} />
                    {r.label}
                  </button>
                ))}
                <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-all hover:shadow-sm hover:border-ring/20">
                  <LayoutGrid className="h-3 w-3" />
                  All recipes
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl px-6 py-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2.5 animate-fade-in", msg.role === "user" ? "justify-end" : "")}>
                  {msg.role === "assistant" && (
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 mt-1">
                      <Sparkles className="h-2.5 w-2.5 text-accent" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line",
                      msg.role === "user"
                        ? "bg-accent text-accent-foreground"
                        : "bg-card border border-border text-foreground"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2.5 animate-fade-in">
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 mt-1">
                    <Sparkles className="h-2.5 w-2.5 text-accent" />
                  </div>
                  <div className="bg-card border border-border rounded-xl px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom input when in chat mode */}
        {!isEmpty && (
          <div className="border-t border-border px-4 py-3">
            <div className="mx-auto max-w-2xl flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-full border border-border bg-card shadow-sm px-4 py-2.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                />
                {input.trim() && (
                  <button
                    onClick={() => handleSend()}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground transition-all hover:opacity-90 ml-2 flex-shrink-0"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
