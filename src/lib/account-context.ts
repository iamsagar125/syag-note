/** Matches Settings / Onboarding account stored in localStorage. */
export const ACCOUNT_LS_KEY = "syag-account";

export interface SyagAccount {
  name?: string;
  email?: string;
  role?: string;
  roleId?: string;
  company?: string;
}

export function loadAccountFromStorage(): SyagAccount {
  try {
    const raw = localStorage.getItem(ACCOUNT_LS_KEY);
    if (raw) return JSON.parse(raw) as SyagAccount;
  } catch {
    /* ignore */
  }
  return { name: "", email: "" };
}

/** Lowercase + strip combining marks so "José" matches "Jose". */
export function normalizeForNameCompare(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Word-like tokens (letters + optional inner apostrophe) for fuzzy STT matching. */
export function tokenizeWordsForNameMatch(text: string): string[] {
  const m = text.match(/[A-Za-zÀ-ÿ]+(?:'[A-Za-z]+)?/gu);
  return m ?? [];
}

/** Levenshtein edit distance (small strings only; names are short). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

/**
 * True if `token` could be a noisy STT rendering of `nameWord` (e.g. cigar ≈ Sagar, Saagar ≈ Sagar).
 * Skipped for very short names to avoid matching common words ("and" ≈ "Ann").
 */
export function nameTokenFuzzyMatch(nameWord: string, token: string): boolean {
  const nameNorm = normalizeForNameCompare(nameWord);
  const tokNorm = normalizeForNameCompare(token);
  if (nameNorm.length < 4) return false;
  if (tokNorm.length < 3) return false;
  if (Math.abs(nameNorm.length - tokNorm.length) > 2) return false;
  const dist = levenshtein(nameNorm, tokNorm);
  // Allow 2 edits for typical name lengths so STT swaps like cigar↔sagar (distance 2) still match.
  const maxDist =
    nameNorm.length <= 4 ? 1 : nameNorm.length <= 8 ? 2 : Math.min(3, Math.floor(nameNorm.length / 3));
  return dist <= maxDist;
}

function accountNameFuzzyInText(nameTrimmed: string, text: string): boolean {
  const parts = nameTrimmed.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  const tokens = tokenizeWordsForNameMatch(text).map((t) => normalizeForNameCompare(t));
  if (tokens.length === 0) return false;

  if (parts.length === 1) {
    const w = normalizeForNameCompare(parts[0]);
    if (w.length < 4) return false;
    return tokens.some((t) => nameTokenFuzzyMatch(parts[0], t));
  }

  let ti = 0;
  for (const part of parts) {
    const pn = normalizeForNameCompare(part);
    const idx = tokens.findIndex((t, i) => {
      if (i < ti) return false;
      if (pn.length < 4) return t === pn;
      return nameTokenFuzzyMatch(part, t) || t === pn;
    });
    if (idx === -1) return false;
    ti = idx + 1;
  }
  return true;
}

/**
 * True if the user's display name appears in `text` with word boundaries
 * (case-insensitive). Supports multi-word names as a phrase.
 * Also matches common STT mishearings per-token (e.g. "cigar" / "Saagar" for "Sagar") when the name is at least 4 letters per fuzzy segment.
 */
export function accountNameAppearsInText(nameTrimmed: string, text: string): boolean {
  const t = nameTrimmed.trim();
  if (t.length < 2) return false;
  const words = t.split(/\s+/).filter(Boolean);
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const body = escaped.length === 1 ? escaped[0] : escaped.join("\\s+");
  try {
    if (new RegExp(`\\b${body}\\b`, "i").test(text)) return true;
  } catch {
    /* invalid name for regex — try fuzzy only */
  }
  return accountNameFuzzyInText(t, text);
}

/** Last N transcript lines as plain text for LLM context. */
export function formatRecentTranscriptForMention(
  lines: { speaker: string; time: string; text: string }[],
  maxLines = 12
): string {
  return lines
    .slice(-maxLines)
    .map((l) => `[${l.speaker}] ${l.text}`)
    .join("\n");
}
