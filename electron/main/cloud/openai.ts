import OpenAI from 'openai'

const MODEL_MAP: Record<string, string> = {
  'GPT-4o': 'gpt-4o',
  'GPT-4o mini': 'gpt-4o-mini',
  'GPT-4 Turbo': 'gpt-4-turbo',
  'o1-preview': 'o1-preview',
}

export async function chatOpenAI(
  messages: { role: string; content: string }[],
  modelName: string,
  apiKey: string,
  onChunk?: (chunk: { text: string; done: boolean }) => void
): Promise<string> {
  const client = new OpenAI({ apiKey })
  const model = MODEL_MAP[modelName] || modelName.toLowerCase().replace(/\s+/g, '-')

  if (onChunk) {
    const stream = await client.chat.completions.create({
      model,
      messages: messages as any,
      stream: true,
    })

    let fullResponse = ''
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || ''
      if (text) {
        fullResponse += text
        onChunk({ text, done: false })
      }
    }
    onChunk({ text: '', done: true })
    return fullResponse
  }

  const response = await client.chat.completions.create({
    model,
    messages: messages as any,
  })

  return response.choices[0]?.message?.content || ''
}

export async function sttOpenAI(wavBuffer: Buffer, apiKey: string, prompt?: string): Promise<string> {
  const client = new OpenAI({ apiKey })

  const file = new File([wavBuffer], 'audio.wav', { type: 'audio/wav' })

  const opts: Record<string, unknown> = {
    file,
    model: 'whisper-1',
    language: 'en',
    response_format: 'text',
  }
  if (prompt?.trim() && prompt.length <= 1000) {
    opts.prompt = prompt.trim()
  }

  const transcription = await client.audio.transcriptions.create(opts as any)

  return transcription as unknown as string
}
