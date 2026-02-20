import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL_MAP: Record<string, string> = {
  'Gemini 2.5 Pro': 'gemini-2.5-pro',
  'Gemini 2.5 Flash': 'gemini-2.5-flash',
  'Gemini 2.0 Flash': 'gemini-2.0-flash',
}

export async function chatGoogle(
  messages: { role: string; content: string }[],
  modelName: string,
  apiKey: string,
  onChunk?: (chunk: { text: string; done: boolean }) => void
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = MODEL_MAP[modelName] || modelName.toLowerCase().replace(/\s+/g, '-')

  const genModel = genAI.getGenerativeModel({ model })

  const systemMessage = messages.find(m => m.role === 'system')
  const chatMessages = messages.filter(m => m.role !== 'system')

  const history = chatMessages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: m.content }],
  }))

  const lastMessage = chatMessages[chatMessages.length - 1]?.content || ''

  const chat = genModel.startChat({
    history,
    systemInstruction: systemMessage?.content
      ? { role: 'user' as any, parts: [{ text: systemMessage.content }] }
      : undefined,
  })

  if (onChunk) {
    const result = await chat.sendMessageStream(lastMessage)
    let fullResponse = ''

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        fullResponse += text
        onChunk({ text, done: false })
      }
    }
    onChunk({ text: '', done: true })
    return fullResponse
  }

  const result = await chat.sendMessage(lastMessage)
  return result.response.text()
}
