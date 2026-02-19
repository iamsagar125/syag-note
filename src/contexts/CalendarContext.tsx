import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CalendarEvent, parseICS } from "@/lib/ics-parser";

interface CalendarContextValue {
  events: CalendarEvent[];
  icsSource: string | null; // "url" | "file" label
  isLoading: boolean;
  error: string | null;
  importFromFile: (content: string, name?: string) => void;
  importFromUrl: (url: string) => Promise<void>;
  clearCalendar: () => void;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

const STORAGE_KEY = "syag_calendar_events";
const SOURCE_KEY = "syag_calendar_source";

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [icsSource, setIcsSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const source = localStorage.getItem(SOURCE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CalendarEvent[];
        setEvents(parsed.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) })));
      }
      if (source) setIcsSource(source);
    } catch { /* ignore corrupt data */ }
  }, []);

  const persist = (evts: CalendarEvent[], source: string) => {
    setEvents(evts);
    setIcsSource(source);
    setError(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(evts));
    localStorage.setItem(SOURCE_KEY, source);
  };

  const importFromFile = useCallback((content: string, name?: string) => {
    try {
      const parsed = parseICS(content);
      if (parsed.length === 0) {
        setError("No events found in the file");
        return;
      }
      persist(parsed, name || "Uploaded file");
    } catch {
      setError("Failed to parse ICS file");
    }
  }, []);

  const importFromUrl = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Try fetching directly (works for CORS-enabled ICS feeds)
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch");
      const text = await res.text();
      const parsed = parseICS(text);
      if (parsed.length === 0) {
        setError("No events found at this URL");
        setIsLoading(false);
        return;
      }
      persist(parsed, url);
    } catch {
      setError("Could not fetch the URL. Try downloading the .ics file and uploading it instead.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCalendar = useCallback(() => {
    setEvents([]);
    setIcsSource(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SOURCE_KEY);
  }, []);

  return (
    <CalendarContext.Provider value={{ events, icsSource, isLoading, error, importFromFile, importFromUrl, clearCalendar }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendar must be used within CalendarProvider");
  return ctx;
}
