/**
 * Build natural-sentence prompt for Whisper (proper nouns, domain terms).
 * Max ~224 tokens (~800 chars). Used by main process capture.
 */

export const WHISPER_PROMPT_MAX_CHARS = 800

export function buildWhisperPrompt(
  title: string,
  vocabulary: string[],
  maxChars: number = WHISPER_PROMPT_MAX_CHARS
): string {
  const parts: string[] = []
  if (title?.trim()) parts.push(`${title.trim()} meeting.`)
  if (vocabulary.length > 0) {
    const terms = vocabulary.slice(0, 35).join(', ')
    parts.push(`Discussion about ${terms}.`)
  }
  const raw = parts.join(' ') || 'Meeting transcription.'
  return raw.length <= maxChars ? raw : raw.slice(0, maxChars).trim()
}
