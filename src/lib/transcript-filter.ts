/**
 * Pure transcript post-processing: collapse repetitions, filter hallucinations, normalize casing.
 * Used by main process capture and testable in Vitest.
 */

/** Collapse repeated phrases and words to one occurrence so we keep content instead of dropping. */
export function collapseRepetitions(text: string): string {
  let out = text.trim()
  // Word-level: consecutive duplicate words (e.g. "that that that" → "that") to fix STT stutter/repetition
  out = out.replace(/\b(\S+)(\s+\1)+\b/gi, '$1')
  // Sentence-level: drop duplicate consecutive sentences (keep first)
  const sentences = out.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  const seen = new Set<string>()
  const kept: string[] = []
  for (const s of sentences) {
    const norm = s.toLowerCase()
    if (norm && !seen.has(norm)) {
      seen.add(norm)
      kept.push(s)
    }
  }
  out = kept.join(' ') || out
  // Phrase repetition: same 10+ char phrase 3+ times → keep once
  out = out.replace(/(.{10,}?)(\s+\1){2,}/g, '$1')
  return out.trim()
}

/** Capitalize first letter of each sentence and " i " → " I ". Lowercase rest for consistent sentence case. */
export function normalizeSentenceCasing(text: string): string {
  const segments = text.split(/(?<=[.!?])\s+|\n+/)
  return segments
    .map((seg) => {
      const t = seg.trim()
      if (!t) return t
      const lower = t.toLowerCase()
      const capped = lower.charAt(0).toUpperCase() + lower.slice(1)
      return capped.replace(/\s+i\s+/g, ' I ')
    })
    .filter(Boolean)
    .join(' ')
}

/** Words with 3+ same letter in a row (e.g. MMM, BBM) often indicate STT garbage. */
function countSuspiciousWords(text: string): number {
  const repeatedChar = /\b\w*([a-zA-Z])\1{2,}\w*\b/g
  const words = text.split(/\s+/)
  return words.filter((w) => {
    repeatedChar.lastIndex = 0
    return repeatedChar.test(w)
  }).length
}

/** Exact full-segment phrases to drop (normalized: lower, no trailing punctuation). */
const FULL_SEGMENT_OUTRO_PHRASES: Set<string> = new Set([
  'thank you for watching',
  'thanks for watching',
  'subscribe',
  'subscribe to our channel',
  'like and subscribe',
  'see you in the next video',
  'see you in the next episode',
  "don't forget to subscribe",
  "don't forget to subscribe.",
  'hit the bell button',
  'hit the subscribe button',
  '[music]',
  '[applause]',
  '[blank_audio]',
  '(music)',
  '(applause)',
  '(laughter)',
])

/** Regex patterns for outros; only applied when segment is short (<= this many words) to avoid dropping valid content. */
const MAX_WORDS_FOR_PATTERN_DROP = 8
const HALLUCINATION_PATTERNS: RegExp[] = [
  /^thank\s+you\s+for\s+watching\.?$/i,
  /^thanks\s+for\s+watching\.?$/i,
  /^subscribe\s*(to\s+our\s+channel)?\.?$/i,
  /^like\s+and\s+subscribe\.?$/i,
  /^see\s+you\s+(in\s+the\s+)?next\s+(video|episode)?\.?$/i,
  /^don't\s+forget\s+to\s+subscribe\.?$/i,
  /^hit\s+the\s+(bell|subscribe)\s+button\.?$/i,
  /^\[music\]$/i, /^\[applause\]$/i, /^\[blank_audio\]$/i,
  /^\(music\)$/i, /^\(applause\)$/i, /^\(laughter\)$/i,
]

/** Filter known Whisper/STT hallucinations; collapse repetitions instead of dropping. */
export function filterHallucinatedTranscript(text: string): string | null {
  const collapsed = collapseRepetitions(text)
  if (!collapsed) return null

  const lower = collapsed.toLowerCase().trim()
  const normalized = lower.replace(/[.!?]+$/, '')
  if (FULL_SEGMENT_OUTRO_PHRASES.has(normalized)) return null

  const words = collapsed.split(/\s+/)
  const wordCount = words.length
  if (wordCount <= MAX_WORDS_FOR_PATTERN_DROP) {
    for (const pat of HALLUCINATION_PATTERNS) {
      if (pat.test(lower)) return null
    }
  }

  // Entire segment is only repeated short phrase (2–4 words 3+ times)
  if (words.length >= 6) {
    for (let len = 2; len <= 4; len++) {
      for (let i = 0; i <= words.length - len * 3; i++) {
        const chunk = words.slice(i, i + len).join(' ').toLowerCase()
        const next1 = words.slice(i + len, i + len * 2).join(' ').toLowerCase()
        const next2 = words.slice(i + len * 2, i + len * 3).join(' ').toLowerCase()
        if (chunk === next1 && chunk === next2) return null
      }
    }
  }

  // Drop segments that look like STT garbage: many words with 3+ same letter (e.g. BBM, MMMBerber)
  const suspiciousCount = countSuspiciousWords(collapsed)
  if (suspiciousCount >= 3) return null
  if (suspiciousCount >= 2 && words.length <= 25) return null

  return normalizeSentenceCasing(collapsed)
}
