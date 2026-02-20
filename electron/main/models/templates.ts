export interface MeetingSummary {
  title: string
  meetingType: string
  attendees: string[]
  overview: string
  decisions: string[]
  discussionTopics: Array<{
    topic: string
    summary: string
    speakers: string[]
  }>
  actionItems: Array<{
    text: string
    assignee: string
    dueDate?: string
    priority: 'high' | 'medium' | 'low'
    done: boolean
  }>
  questionsAndOpenItems: string[]
  followUps: string[]
  keyQuotes: Array<{
    speaker: string
    text: string
  }>
}

export interface MeetingTemplate {
  id: string
  name: string
  icon: string
  description: string
  emphasisSections: string[]
  additionalPrompt: string
}

export const MEETING_TEMPLATES: MeetingTemplate[] = [
  {
    id: 'general',
    name: 'General Meeting',
    icon: '📋',
    description: 'Default balanced template for any meeting',
    emphasisSections: ['discussionTopics', 'actionItems'],
    additionalPrompt: `STRUCTURE: Organize notes by the actual topics discussed in the meeting. Each topic becomes a discussionTopic entry.

For each topic, the "summary" field should contain concise bullet points (each line starts with "- "). Capture:
- Key points raised
- Decisions made (prefix with "Decision: ")
- Who said what (only when attribution matters)

Example output structure:
discussionTopics: [
  { "topic": "Q3 Launch Timeline", "summary": "- Team agreed on Sept 15 launch date\\n- Marketing assets need 2 more weeks\\n- Decision: delay beta by 1 week to align", "speakers": ["Speaker 1", "Speaker 2"] },
  { "topic": "Hiring Update", "summary": "- 3 candidates in pipeline for senior role\\n- Interviews scheduled next week", "speakers": ["Speaker 1"] }
]

DO NOT use generic topic names like "Discussion" or "Updates". Use the ACTUAL subject discussed.
The overview should be 1 sentence: what the meeting was about.
Omit decisions array — fold decisions into the relevant topic bullets prefixed with "Decision: ".
Omit keyQuotes, followUps unless truly necessary.`,
  },
  {
    id: 'standup',
    name: 'Standup / Daily',
    icon: '🏃',
    description: 'Focus on blockers, progress, and plans',
    emphasisSections: ['discussionTopics', 'actionItems'],
    additionalPrompt: `STRUCTURE: Organize by PERSON. Each speaker becomes a discussionTopic.

For each person's topic, the "summary" field should contain:
- Done: what they completed (prefix each with "Done: ")
- Doing: what they're working on (prefix each with "Doing: ")
- Blocker: any blockers (prefix each with "Blocker: ")

Example:
discussionTopics: [
  { "topic": "Speaker 1", "summary": "- Done: shipped auth flow\\n- Doing: working on payment integration\\n- Blocker: waiting on API keys from vendor", "speakers": ["Speaker 1"] },
  { "topic": "Speaker 2", "summary": "- Done: fixed 3 bugs from QA\\n- Doing: performance optimization\\n- No blockers", "speakers": ["Speaker 2"] }
]

Turn every blocker into a high-priority action item.
Overview: 1 sentence, e.g. "Daily standup covering sprint progress and blockers."
Omit decisions, keyQuotes, followUps.`,
  },
  {
    id: 'one-on-one',
    name: '1:1 Meeting',
    icon: '🤝',
    description: 'Focus on feedback, goals, and personal development',
    emphasisSections: ['discussionTopics', 'actionItems'],
    additionalPrompt: `STRUCTURE: Organize by conversation theme. Typical topics:
- "Check-in" (how things are going, workload, morale)
- "Project Updates" (status of current work)
- "Feedback" (any feedback given or received)
- "Growth & Development" (career goals, skills, learning)
- "Team & Process" (team dynamics, process improvements)

Only include topics that were actually discussed. Each topic's "summary" should be bullet points:
- What was discussed
- Any commitments made (prefix with "Agreed: ")
- Feedback given (prefix with "Feedback: ")

Example:
{ "topic": "Feedback", "summary": "- Feedback: presentation skills have improved significantly\\n- Feedback: need to be more proactive in cross-team communication\\n- Agreed: will join design reviews going forward", "speakers": ["Speaker 1", "Speaker 2"] }

Treat implicit commitments as action items ("I'll think about it" = action item).
Overview: 1 sentence.
Omit decisions, keyQuotes.`,
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    icon: '💡',
    description: 'Focus on ideas generated, evaluations, and decisions',
    emphasisSections: ['discussionTopics', 'actionItems'],
    additionalPrompt: `STRUCTURE: Organize by idea or approach discussed.

Each idea/approach becomes a topic. The "summary" should contain:
- What the idea is (1 line)
- Pros mentioned (prefix "Pro: ")
- Cons mentioned (prefix "Con: ")
- Verdict if any (prefix "Decision: " or "Parked: ")

Example:
{ "topic": "Microservices Migration", "summary": "- Break monolith into 3 services\\n- Pro: independent deployments\\n- Pro: team autonomy\\n- Con: operational complexity\\n- Decision: start with auth service as pilot", "speakers": ["Speaker 1", "Speaker 2"] }

If an idea was selected, add next steps as action items.
Overview: 1 sentence, what was being brainstormed.
Omit keyQuotes, followUps.`,
  },
  {
    id: 'customer-call',
    name: 'Customer Call',
    icon: '📞',
    description: 'Focus on pain points, requirements, and commitments',
    emphasisSections: ['discussionTopics', 'actionItems'],
    additionalPrompt: `STRUCTURE: Organize by conversation area. Typical topics:
- "Customer Context" (who they are, what they need)
- "Pain Points" (problems they're facing)
- "Product Discussion" (features discussed, demo feedback)
- "Pricing & Timeline" (if discussed)
- "Commitments" (what we promised)

Each topic "summary" as bullet points. For Pain Points, be specific about the customer's exact frustration.

ANY promise made to the customer is a HIGH-PRIORITY action item.
Capture customer quotes that reveal strong sentiment in keyQuotes (max 2).
Overview: 1 sentence, who the customer is and purpose of call.`,
  },
  {
    id: 'interview',
    name: 'Interview',
    icon: '🎯',
    description: 'Focus on candidate assessment and key answers',
    emphasisSections: ['discussionTopics', 'actionItems', 'keyQuotes'],
    additionalPrompt: `STRUCTURE: Organize by assessment area. Typical topics:
- "Background & Experience" (candidate's history)
- "Technical Assessment" (technical questions and quality of answers)
- "Problem Solving" (how they approach problems)
- "Culture & Values" (team fit signals)
- "Candidate Questions" (what they asked us)
- "Overall Impression" (strengths, concerns, recommendation)

Each topic "summary" as bullet points:
- Key observations
- Strong answers (prefix "Strength: ")
- Concerns (prefix "Concern: ")

Capture 2-3 notable candidate responses as keyQuotes.
Action items: next steps in hiring process.
Overview: 1 sentence, role and candidate name if mentioned.`,
  },
  {
    id: 'retrospective',
    name: 'Retrospective',
    icon: '🔄',
    description: 'Focus on what went well, what to improve, and actions',
    emphasisSections: ['discussionTopics', 'actionItems'],
    additionalPrompt: `STRUCTURE: Use exactly these three topics:
1. "What Went Well" — things the team wants to keep doing
2. "What Didn't Go Well" — problems, frustrations, failures
3. "Improvements" — specific changes to try

Each topic "summary" as bullet points listing the items discussed.

EVERY improvement suggestion MUST have a corresponding action item with an owner.
Overview: 1 sentence, what sprint/period the retro covers.
Omit keyQuotes, followUps.`,
  },
]

export function getTemplate(templateId: string): MeetingTemplate {
  return MEETING_TEMPLATES.find(t => t.id === templateId) ?? MEETING_TEMPLATES[0]
}

export function detectMeetingType(transcript: string, personalNotes: string): string {
  const text = (transcript + ' ' + personalNotes).toLowerCase()

  const signals: Record<string, number> = {
    standup: 0,
    'one-on-one': 0,
    brainstorm: 0,
    'customer-call': 0,
    interview: 0,
    retrospective: 0,
  }

  const patterns: Record<string, RegExp[]> = {
    standup: [
      /\b(standup|stand-up|daily|sync|scrum|sprint)\b/,
      /\b(blocker|blocked|blocking|impediment)\b/,
      /\b(yesterday|today|tomorrow)\b/,
      /\bwhat (did you|are you|will you)\b/,
    ],
    'one-on-one': [
      /\b(1[:-]1|one[ -]on[ -]one|1on1)\b/,
      /\b(career|growth|development|feedback|mentoring)\b/,
      /\bhow are you (doing|feeling)\b/,
      /\b(goals|performance|review)\b/,
    ],
    brainstorm: [
      /\b(brainstorm|ideation|ideas|creative)\b/,
      /\bwhat if\b/,
      /\b(how about|we could|what about|another idea)\b/,
      /\b(pros|cons|tradeoff|trade-off)\b/,
    ],
    'customer-call': [
      /\b(customer|client|user|prospect|demo)\b/,
      /\b(pain point|feature request|requirement|pricing)\b/,
      /\b(contract|deal|proposal|quote|subscription)\b/,
      /\b(competitor|alternative|compared to)\b/,
    ],
    interview: [
      /\b(interview|candidate|resume|cv|hiring)\b/,
      /\btell me about\b/,
      /\b(experience with|worked on|background)\b/,
      /\b(salary|compensation|offer|position)\b/,
    ],
    retrospective: [
      /\b(retro|retrospective|post-mortem|postmortem)\b/,
      /\bwhat went (well|wrong)\b/,
      /\b(improve|improvement|better|worse)\b/,
      /\b(keep doing|stop doing|start doing)\b/,
    ],
  }

  for (const [type, regexes] of Object.entries(patterns)) {
    for (const regex of regexes) {
      const matches = text.match(new RegExp(regex, 'gi'))
      if (matches) {
        signals[type] += matches.length
      }
    }
  }

  let bestType = 'general'
  let bestScore = 2

  for (const [type, score] of Object.entries(signals)) {
    if (score > bestScore) {
      bestScore = score
      bestType = type
    }
  }

  return bestType
}
