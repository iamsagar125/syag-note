/**
 * Parse STT model string into provider and model name.
 * Format: "providerId:modelName" (e.g. "deepgram:Nova-2", "groq:whisper-large-v3").
 */

export function parseSTTModel(model: string): { providerId: string; modelName: string } | null {
  if (!model?.trim()) return null
  const [providerId, ...rest] = model.split(':')
  const modelName = rest.join(':').trim()
  if (!providerId?.trim()) return null
  return { providerId: providerId.trim(), modelName }
}
