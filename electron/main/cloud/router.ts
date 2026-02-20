import { getSetting } from '../storage/database'
import { chatOpenAI, sttOpenAI } from './openai'
import { chatAnthropic } from './anthropic'
import { chatGoogle } from './google'
import { sttDeepgram } from './deepgram'
import { sttAssemblyAI } from './assemblyai'
import { chatGroq, sttGroq } from './groq'

function getApiKey(providerId: string): string {
  const { safeStorage } = require('electron')
  const { readFileSync, existsSync } = require('fs')
  const { join } = require('path')
  const { app } = require('electron')

  const keychainPath = join(app.getPath('userData'), 'secure', 'keychain.enc')
  if (!existsSync(keychainPath)) {
    throw new Error(`No API key configured for ${providerId}. Add it in Settings > AI Models.`)
  }

  try {
    const encrypted = readFileSync(keychainPath)
    const decrypted = safeStorage.decryptString(encrypted)
    const keys = JSON.parse(decrypted)
    const key = keys[providerId]
    if (!key) {
      throw new Error(`No API key configured for ${providerId}. Add it in Settings > AI Models.`)
    }
    return key
  } catch (err: any) {
    if (err.message?.includes('No API key')) throw err
    throw new Error(`Failed to read API key for ${providerId}: ${err.message}`)
  }
}

/**
 * Route an LLM chat/completion request to the appropriate cloud provider.
 * model format: "providerId:modelName" (e.g., "openai:GPT-4o")
 */
export async function routeLLM(
  messages: { role: string; content: string }[],
  model: string,
  onChunk?: (chunk: { text: string; done: boolean }) => void
): Promise<string> {
  const [providerId, ...rest] = model.split(':')
  const modelName = rest.join(':')

  const apiKey = getApiKey(providerId)

  switch (providerId) {
    case 'openai':
      return chatOpenAI(messages, modelName, apiKey, onChunk)
    case 'anthropic':
      return chatAnthropic(messages, modelName, apiKey, onChunk)
    case 'google':
      return chatGoogle(messages, modelName, apiKey, onChunk)
    case 'groq':
      return chatGroq(messages, modelName, apiKey, onChunk)
    default:
      throw new Error(`Unknown LLM provider: ${providerId}`)
  }
}

/**
 * Route an STT request to the appropriate cloud provider.
 * model format: "providerId:modelName" (e.g., "deepgram:Nova-2")
 */
export async function routeSTT(wavBuffer: Buffer, model: string): Promise<string> {
  const [providerId, ...rest] = model.split(':')
  const modelName = rest.join(':')

  const apiKey = getApiKey(providerId)

  switch (providerId) {
    case 'openai':
      return sttOpenAI(wavBuffer, apiKey)
    case 'deepgram':
      return sttDeepgram(wavBuffer, modelName, apiKey)
    case 'assemblyai':
      return sttAssemblyAI(wavBuffer, apiKey)
    case 'groq':
      return sttGroq(wavBuffer, apiKey)
    default:
      throw new Error(`Unknown STT provider: ${providerId}`)
  }
}

export { chat } from '../models/llm-engine'
