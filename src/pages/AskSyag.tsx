import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { AskBar } from "@/components/AskBar";

const suggestions = [
  "What were the key decisions from last week?",
  "Summarize all action items assigned to me",
  "What did we discuss about the product roadmap?",
  "Any updates on hiring?",
];

export default function AskSyag() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col min-w-0 relative">
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="flex h-full flex-col items-center justify-center text-center px-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 mb-4">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <h2 className="font-display text-xl text-foreground mb-1">What would you like to know?</h2>
            <p className="mb-6 max-w-sm text-[13px] text-muted-foreground">
              Ask me anything about your meetings — decisions, action items, and insights.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-w-md w-full">
              {suggestions.map((s) => (
                <button
                  key={s}
                  className="rounded-lg border border-border bg-card p-3 text-left text-[13px] text-foreground transition-all hover:border-ring/20 hover:shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <AskBar context="home" />
        </div>
      </main>
    </div>
  );
}
