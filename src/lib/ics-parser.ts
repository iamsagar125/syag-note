export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  /** Extracted from DESCRIPTION or LOCATION (Meet/Zoom/Teams join URL) */
  joinLink?: string;
}

const JOIN_LINK_REGEX = /https?:\/\/[^\s<>"']+/i;

function extractJoinLink(text: string): string | undefined {
  const match = text.match(JOIN_LINK_REGEX);
  return match ? match[0].replace(/[)\],]+$/, '') : undefined;
}

/**
 * Parse ICS content string into CalendarEvent array.
 */
export function parseICS(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lines = unfoldLines(icsContent);

  let inEvent = false;
  let current: Partial<CalendarEvent> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
    } else if (line === "END:VEVENT" && inEvent) {
      inEvent = false;
      if (current.title && current.start) {
        const desc = current.description ?? '';
        const loc = current.location ?? '';
        const joinLink = extractJoinLink(desc) || extractJoinLink(loc);
        events.push({
          id: current.id || crypto.randomUUID(),
          title: current.title,
          start: current.start,
          end: current.end || current.start,
          location: current.location,
          description: current.description,
          joinLink,
        });
      }
    } else if (inEvent) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).split(";")[0].toUpperCase();
      const value = line.slice(colonIdx + 1);

      switch (key) {
        case "SUMMARY":
          current.title = unescapeICS(value);
          break;
        case "DTSTART":
          current.start = parseICSDate(value);
          break;
        case "DTEND":
          current.end = parseICSDate(value);
          break;
        case "LOCATION":
          current.location = unescapeICS(value);
          break;
        case "DESCRIPTION":
          current.description = unescapeICS(value);
          break;
        case "UID":
          current.id = value;
          break;
      }
    }
  }

  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function unfoldLines(text: string): string[] {
  // ICS spec: lines starting with space/tab are continuations
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function parseICSDate(value: string): Date {
  // Handle formats: 20250101T120000Z or 20250101T120000 or 20250101
  const clean = value.replace(/[^0-9TZ]/g, "");
  const y = parseInt(clean.slice(0, 4));
  const m = parseInt(clean.slice(4, 6)) - 1;
  const d = parseInt(clean.slice(6, 8));
  if (clean.length <= 8) return new Date(y, m, d);
  const h = parseInt(clean.slice(9, 11));
  const min = parseInt(clean.slice(11, 13));
  const s = parseInt(clean.slice(13, 15)) || 0;
  if (clean.endsWith("Z")) return new Date(Date.UTC(y, m, d, h, min, s));
  return new Date(y, m, d, h, min, s);
}

function unescapeICS(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}
