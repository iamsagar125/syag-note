import { getModelPath } from './manager'
import { routeLLM } from '../cloud/router'
import { getTemplate, detectMeetingType, type MeetingSummary, type MeetingTemplate } from './templates'

// ─── Two-Pass Summarization Prompts ─────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are an expert meeting analyst. Extract structured information from the transcript and personal notes.

Output valid JSON with these fields:
{
  "attendees": ["speaker labels as they appear"],
  "topics": [
    {
      "name": "Actual subject discussed (specific, not generic)",
      "points": ["key point or statement"],
      "decisions": ["any decision made about this topic"],
      "speakers": ["who participated"]
    }
  ],
  "action_items": [
    {
      "task": "specific task",
      "owner": "who (speaker label or 'You' from personal notes)",
      "deadline": "if mentioned, else null",
      "priority": "high|medium|low"
    }
  ],
  "unresolved": ["unanswered questions or open items"],
  "notable_quotes": [{"speaker": "who", "text": "what they said"}]
}

RULES:
- Topic names must be SPECIFIC (e.g. "Q3 Launch Timeline", not "Updates")
- Extract implicit action items: "I'll send that over" = action item
- Extract implicit decisions: "Let's go with option A" = decision under that topic
- Include personal notes context where relevant
- Be thorough — extract everything, synthesis will filter

Valid JSON only.`

function buildSynthesisSystemPrompt(template: MeetingTemplate): string {
  return `You are Syag, a meeting note synthesizer. Produce clean, topic-first notes organized by TOPIC.

OUTPUT FORMAT (valid JSON only):
{
  "title": "5-8 word title",
  "meetingType": "${template.id}",
  "attendees": ["Speaker 1", "Speaker 2"],
  "overview": "One sentence. What this meeting was about.",
  "discussionTopics": [
    {
      "topic": "Specific Topic Name",
      "summary": "- Bullet point 1\\n- Bullet point 2\\n- Decision: what was decided",
      "speakers": ["Speaker 1"]
    }
  ],
  "actionItems": [
    {
      "text": "Task description",
      "assignee": "Who",
      "dueDate": "when or null",
      "priority": "high|medium|low",
      "done": false
    }
  ],
  "questionsAndOpenItems": ["Unresolved question"],
  "keyQuotes": [{"speaker": "Who", "text": "Quote"}]
}

NOTE FORMAT RULES:
- The notes are TOPIC-FIRST. Each discussionTopic is a section heading with bullet points underneath.
- Topic "summary" field = newline-separated bullet points starting with "- ". This is the core of the notes.
- Each bullet: one line, one idea. No prose, no paragraphs.
- Decisions go INSIDE their topic bullets as "- Decision: ..." — NOT in a separate decisions array.
- Overview: exactly 1 sentence. Just context, not a summary.
- Action items: at the end. One line each. "[Task] — [person]" format in the text field.
- questionsAndOpenItems: only if genuinely unresolved. One line each. Omit if empty.
- keyQuotes: max 2. Only include if truly notable. Omit if nothing stands out.
- Omit followUps and decisions arrays entirely (fold into topics and action items).
- DO NOT use generic topic names ("Discussion", "Updates", "Miscellaneous"). Be SPECIFIC.
- If personal notes add info not in transcript, weave it into the relevant topic.
${template.additionalPrompt ? '\n' + template.additionalPrompt : ''}

Valid JSON only. No markdown wrapping.`
}

const CHAT_SYSTEM_PROMPT = `You are Syag, an AI assistant that helps users understand and query their meeting notes. You have access to the user's notes and transcripts. Be concise, helpful, and reference specific meetings when relevant.`

// ─── Summarize ──────────────────────────────────────────────────────────────

export async function summarize(
  transcript: any[],
  personalNotes: string,
  model: string,
  meetingTemplateId?: string
): Promise<MeetingSummary> {
  const transcriptText = transcript.map(t => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n')

  // Auto-detect meeting type if not specified
  const templateId = meetingTemplateId || detectMeetingType(transcriptText, personalNotes)
  const template = getTemplate(templateId)

  if (model.startsWith('local:')) {
    return summarizeWithLocal(transcriptText, personalNotes, model.replace('local:', ''), template)
  }

  // Pass 1: Extract structured data
  const extractionInput = `## Meeting Transcript\n${transcriptText}\n\n## Personal Notes\n${personalNotes || '(none)'}\n\nExtract all structured information from this meeting.`

  const extractedData = await routeLLM(
    [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: extractionInput },
    ],
    model
  )

  // Pass 2: Synthesize into final summary
  const synthesisInput = `## Extracted Meeting Data\n${extractedData}\n\n## Original Personal Notes\n${personalNotes || '(none)'}\n\nSynthesize this into a polished meeting summary.`

  const finalSummary = await routeLLM(
    [
      { role: 'system', content: buildSynthesisSystemPrompt(template) },
      { role: 'user', content: synthesisInput },
    ],
    model
  )

  return parseMeetingSummary(finalSummary, template)
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export async function chat(
  messages: any[],
  context: any,
  model: string,
  onChunk?: (chunk: { text: string; done: boolean }) => void
): Promise<string> {
  const systemMessage = context?.notes
    ? `${CHAT_SYSTEM_PROMPT}\n\nContext from user's notes:\n${context.notes}`
    : CHAT_SYSTEM_PROMPT

  const llmMessages = [
    { role: 'system', content: systemMessage },
    ...messages.map((m: any) => ({ role: m.role, content: m.text || m.content })),
  ]

  if (model.startsWith('local:')) {
    return chatWithLocal(llmMessages, model.replace('local:', ''), onChunk)
  }

  return routeLLM(llmMessages, model, onChunk)
}

// ─── Local Model Fallbacks ──────────────────────────────────────────────────

async function summarizeWithLocal(
  transcriptText: string,
  personalNotes: string,
  modelId: string,
  template: MeetingTemplate
): Promise<MeetingSummary> {
  const modelPath = getModelPath(modelId)
  if (!modelPath) {
    throw new Error(`Model not downloaded: ${modelId}`)
  }

  try {
    const { getLlama, LlamaChatSession } = await import('node-llama-cpp')

    const llama = await getLlama()
    const model = await llama.loadModel({ modelPath })
    const ctx = await model.createContext()
    const session = new LlamaChatSession({ contextSequence: ctx.getSequence() })

    // Single pass for local models (smaller context window)
    const prompt = `${buildSynthesisSystemPrompt(template)}

## Meeting Transcript
${transcriptText}

## Personal Notes
${personalNotes || '(none)'}

Generate a structured meeting summary as JSON.`

    const response = await session.prompt(prompt, {
      maxTokens: 2048,
      temperature: 0.3,
    })

    await model.dispose()
    return parseMeetingSummary(response, template)
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND' || err.message?.includes('Cannot find module')) {
      throw new Error('node-llama-cpp is not installed. Install it with: npm install node-llama-cpp')
    }
    throw err
  }
}

async function chatWithLocal(
  messages: any[],
  modelId: string,
  onChunk?: (chunk: { text: string; done: boolean }) => void
): Promise<string> {
  const modelPath = getModelPath(modelId)
  if (!modelPath) {
    throw new Error(`Model not downloaded: ${modelId}`)
  }

  try {
    const { getLlama, LlamaChatSession } = await import('node-llama-cpp')

    const llama = await getLlama()
    const model = await llama.loadModel({ modelPath })
    const ctx = await model.createContext()
    const session = new LlamaChatSession({ contextSequence: ctx.getSequence() })

    const systemContent = messages.find(m => m.role === 'system')?.content || ''
    const userMessages = messages.filter(m => m.role !== 'system')
    const lastMessage = userMessages[userMessages.length - 1]?.content || ''

    const prompt = systemContent
      ? `${systemContent}\n\nUser: ${lastMessage}`
      : lastMessage

    let fullResponse = ''

    if (onChunk) {
      await session.prompt(prompt, {
        maxTokens: 2048,
        temperature: 0.7,
        onTextChunk: (text: string) => {
          fullResponse += text
          onChunk({ text, done: false })
        },
      })
      onChunk({ text: '', done: true })
    } else {
      fullResponse = await session.prompt(prompt, {
        maxTokens: 2048,
        temperature: 0.7,
      })
    }

    await model.dispose()
    return fullResponse
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND' || err.message?.includes('Cannot find module')) {
      throw new Error('node-llama-cpp is not installed. Install it with: npm install node-llama-cpp')
    }
    throw err
  }
}

// ─── Response Parsing ───────────────────────────────────────────────────────

function parseMeetingSummary(response: string, template: MeetingTemplate): MeetingSummary {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      // Extract inline decisions from topic bullets into the decisions array for backward compat
      const inlineDecisions: string[] = []
      const topics = Array.isArray(parsed.discussionTopics)
        ? parsed.discussionTopics.map((t: any) => {
            const summary = t.summary || t.description || ''
            // Pull out "- Decision: ..." lines for the decisions array too
            const lines = summary.split('\n')
            for (const line of lines) {
              const match = line.match(/^-\s*Decision:\s*(.+)/i)
              if (match) inlineDecisions.push(match[1].trim())
            }
            return {
              topic: t.topic || t.name || 'Topic',
              summary,
              speakers: Array.isArray(t.speakers) ? t.speakers : [],
            }
          })
        : []

      return {
        title: parsed.title || 'Meeting Notes',
        meetingType: parsed.meetingType || template.id,
        attendees: Array.isArray(parsed.attendees) ? parsed.attendees : [],
        overview: parsed.overview || '',
        decisions: Array.isArray(parsed.decisions)
          ? parsed.decisions
          : inlineDecisions,
        discussionTopics: topics,
        actionItems: Array.isArray(parsed.actionItems)
          ? parsed.actionItems.map((a: any) => ({
              text: a.text || a.task || a.description || String(a),
              assignee: a.assignee || a.owner || 'You',
              dueDate: a.dueDate || a.deadline || undefined,
              priority: ['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium',
              done: a.done ?? false,
            }))
          : [],
        questionsAndOpenItems: Array.isArray(parsed.questionsAndOpenItems)
          ? parsed.questionsAndOpenItems
          : Array.isArray(parsed.questions) ? parsed.questions : [],
        followUps: Array.isArray(parsed.followUps) ? parsed.followUps : [],
        keyQuotes: Array.isArray(parsed.keyQuotes)
          ? parsed.keyQuotes.map((q: any) => ({
              speaker: q.speaker || 'Unknown',
              text: q.text || q.quote || String(q),
            }))
          : [],
      }
    }
  } catch (err) {
    console.error('Failed to parse summary JSON:', err)
  }

  return {
    title: 'Meeting Notes',
    meetingType: template.id,
    attendees: [],
    overview: response.slice(0, 500),
    decisions: [],
    discussionTopics: [],
    actionItems: [{ text: 'Review generated summary', assignee: 'You', priority: 'medium', done: false }],
    questionsAndOpenItems: [],
    followUps: [],
    keyQuotes: [],
  }
}
