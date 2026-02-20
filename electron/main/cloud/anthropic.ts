import Anthropic from '@anthropic-ai/sdk'

const MODEL_MAP: Record<string, string> = {
  'Claude 4 Sonnet': 'claude-sonnet-4-20250514',
  'Claude 4 Opus': 'claude-4-opus-20260101',
  'Claude 3.5 Haiku': 'claude-3-5-haiku-20241022',
}

export async function chatAnthropic(
  messages: { role: string; content: string }[],
  modelName: string,
  apiKey: string,
  onChunk?: (chunk: { text: string; done: boolean }) => void
): Promise<string> {
  const client = new Anthropic({ apiKey })
  const model = MODEL_MAP[modelName] || modelName.toLowerCase().replace(/\s+/g, '-')

  const systemMessage = messages.find(m => m.role === 'system')
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  if (onChunk) {
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemMessage?.content,
      messages: chatMessages,
    })

    let fullResponse = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text
        fullResponse += text
        onChunk({ text, done: false })
      }
    }
    onChunk({ text: '', done: true })
    return fullResponse
  }

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: systemMessage?.content,
    messages: chatMessages,
  })

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')
}
