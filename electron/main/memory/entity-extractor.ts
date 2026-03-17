/**
 * Entity Extraction Engine
 * 
 * Runs automatically after meeting summarization to extract:
 * - People mentioned/attending
 * - Commitments (promises, action items, deadlines)
 * - Topics/themes discussed
 * 
 * Populates the Memory Layer tables for cross-meeting intelligence.
 */

import { routeLLM } from '../cloud/router'
import { randomUUID } from 'crypto'

// Types for extraction results
export interface ExtractedEntities {
  people: Array<{
    name: string
    email?: string
    company?: string
    role?: string
    relationship?: string
  }>
  commitments: Array<{
    text: string
    owner: string  // 'you' or person name
    assignee?: string  // person name
    dueDate?: string  // ISO date or natural language
  }>
  topics: string[]  // topic labels
}

const EXTRACTION_PROMPT = `You are an entity extraction system. Given a meeting summary and transcript excerpt, extract structured data.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "people": [
    {"name": "Full Name", "email": "email@example.com", "company": "Company", "role": "Job Title", "relationship": "colleague|client|vendor|manager|report|skip-level|external"}
  ],
  "commitments": [
    {"text": "What was promised", "owner": "you|Person Name", "assignee": "Person Name or null", "dueDate": "2024-03-20 or by Friday or null"}
  ],
  "topics": ["Topic 1", "Topic 2"]
}

Rules:
- For people: extract everyone mentioned by name. If email is available from context, include it. Infer company/role from context when clear.
- For commitments: extract any promise, action item, follow-up, or deliverable. "I'll send the report" = owner: "you". "Sarah will prepare the deck" = owner: "Sarah", assignee: "Sarah".
- For topics: extract 2-5 high-level themes (e.g., "Q3 Budget", "Hiring Pipeline", "Product Roadmap"). Be specific, not generic.
- Use "you" for the meeting recorder/note-taker. Use actual names for others.
- If a due date is mentioned (even implicitly like "by end of week" or "before the next standup"), include it.
- Do NOT include the meeting recorder as a person entry (they are implicit).
- Return empty arrays if nothing found for a category.`

/**
 * Extract entities from a meeting summary and transcript.
 * Retries once on JSON parse failure with a simpler prompt.
 */
export async function extractEntities(
  summary: any,
  transcript: Array<{ speaker: string; time: string; text: string }>,
  model: string,
  calendarAttendees?: string[]
): Promise<ExtractedEntities> {
  // Build the context for extraction
  const summaryText = buildSummaryText(summary)
  const transcriptExcerpt = transcript
    .slice(-50)  // Last 50 lines for context
    .map(t => `[${t.speaker}] ${t.text}`)
    .join('\n')
  
  const attendeeContext = calendarAttendees?.length
    ? `\nCalendar attendees (emails): ${calendarAttendees.join(', ')}`
    : ''

  const userMessage = `Meeting Summary:\n${summaryText}\n\nTranscript (last portion):\n${transcriptExcerpt}${attendeeContext}`

  try {
    const response = await routeLLM(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: userMessage },
      ],
      model
    )
    
    return parseExtractionResponse(response)
  } catch (err) {
    console.error('[entity-extractor] First attempt failed:', err)
    
    // Retry with simpler prompt
    try {
      const simplePrompt = `Extract people names, action items, and discussion topics from this meeting summary. Return JSON: {"people": [{"name": "..."}], "commitments": [{"text": "...", "owner": "you"}], "topics": ["..."]}\n\n${summaryText}`
      const response = await routeLLM(
        [{ role: 'user', content: simplePrompt }],
        model
      )
      return parseExtractionResponse(response)
    } catch (retryErr) {
      console.error('[entity-extractor] Retry failed:', retryErr)
      return { people: [], commitments: [], topics: [] }
    }
  }
}

function buildSummaryText(summary: any): string {
  const parts: string[] = []
  if (summary.overview) parts.push(`Overview: ${summary.overview}`)
  if (summary.keyPoints?.length) parts.push(`Key Points:\n${summary.keyPoints.map((p: string) => `- ${p}`).join('\n')}`)
  if (summary.decisions?.length) parts.push(`Decisions:\n${summary.decisions.map((d: string) => `- ${d}`).join('\n')}`)
  if (summary.actionItems?.length) {
    parts.push(`Action Items:\n${summary.actionItems.map((ai: any) => {
      const assignee = ai.assignee && ai.assignee !== 'Unassigned' ? ` (assigned to ${ai.assignee})` : ''
      const due = ai.dueDate ? ` [due: ${ai.dueDate}]` : ''
      return `- ${ai.text}${assignee}${due}`
    }).join('\n')}`)
  }
  if (summary.discussionTopics?.length) {
    parts.push(`Discussion Topics:\n${summary.discussionTopics.map((t: any) => {
      const speakers = t.speakers?.length ? ` (${t.speakers.join(', ')})` : ''
      return `- ${t.topic}${speakers}: ${t.summary || ''}`
    }).join('\n')}`)
  }
  if (summary.keyQuotes?.length) {
    parts.push(`Key Quotes:\n${summary.keyQuotes.map((q: any) => `- "${q.text}" — ${q.speaker}`).join('\n')}`)
  }
  return parts.join('\n\n')
}

function parseExtractionResponse(response: string): ExtractedEntities {
  // Try to find JSON in the response (handle markdown code blocks)
  let jsonStr = response.trim()
  
  // Strip markdown code block if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()
  
  // Try to find JSON object
  const braceMatch = jsonStr.match(/\{[\s\S]*\}/)
  if (braceMatch) jsonStr = braceMatch[0]
  
  try {
    const parsed = JSON.parse(jsonStr)
    return {
      people: Array.isArray(parsed.people) ? parsed.people.filter((p: any) => p?.name) : [],
      commitments: Array.isArray(parsed.commitments) ? parsed.commitments.filter((c: any) => c?.text) : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics.filter((t: any) => typeof t === 'string' && t.trim()) : [],
    }
  } catch {
    console.error('[entity-extractor] JSON parse failed for:', jsonStr.slice(0, 200))
    return { people: [], commitments: [], topics: [] }
  }
}

/**
 * Process extracted entities into the memory database.
 * Call this after extractEntities() returns.
 */
export async function storeExtractedEntities(
  noteId: string,
  entities: ExtractedEntities,
  calendarAttendees?: Array<{ name?: string; email?: string }>
): Promise<{ peopleCount: number; commitmentCount: number; topicCount: number }> {
  // Lazy import stores to avoid circular deps
  const { upsertPerson, linkPersonToNote } = await import('./people-store')
  const { addCommitment } = await import('./commitment-store')
  const { upsertTopic, linkTopicToNote } = await import('./topic-store')

  let peopleCount = 0
  let commitmentCount = 0
  let topicCount = 0

  // Map of name -> personId for commitment assignee linking
  const nameToPersonId: Record<string, string> = {}

  // 1. Process people
  for (const p of entities.people) {
    try {
      // Cross-reference with calendar attendees for email matching
      let email = p.email
      if (!email && calendarAttendees?.length) {
        const attendee = calendarAttendees.find(
          a => a.name && a.name.toLowerCase().includes(p.name.toLowerCase())
        )
        if (attendee?.email) email = attendee.email
      }

      const person = upsertPerson({
        name: p.name,
        email: email || undefined,
        company: p.company,
        role: p.role,
        relationship: p.relationship,
      })
      
      if (person) {
        linkPersonToNote(noteId, person.id, 'attendee')
        nameToPersonId[p.name.toLowerCase()] = person.id
        peopleCount++
      }
    } catch (err) {
      console.error(`[entity-extractor] Failed to store person ${p.name}:`, err)
    }
  }

  // 2. Process commitments
  for (const c of entities.commitments) {
    try {
      // Resolve assignee to person ID
      let assigneeId: string | undefined
      if (c.assignee) {
        assigneeId = nameToPersonId[c.assignee.toLowerCase()]
      }

      addCommitment({
        noteId,
        text: c.text,
        owner: c.owner || 'you',
        assigneeId,
        dueDate: c.dueDate || undefined,
      })
      commitmentCount++
    } catch (err) {
      console.error(`[entity-extractor] Failed to store commitment:`, err)
    }
  }

  // 3. Process topics
  for (const label of entities.topics) {
    try {
      const topic = upsertTopic(label)
      if (topic) {
        linkTopicToNote(noteId, topic.id)
        topicCount++
      }
    } catch (err) {
      console.error(`[entity-extractor] Failed to store topic ${label}:`, err)
    }
  }

  console.log(`[entity-extractor] Stored entities for note ${noteId}: ${peopleCount} people, ${commitmentCount} commitments, ${topicCount} topics`)
  return { peopleCount, commitmentCount, topicCount }
}
