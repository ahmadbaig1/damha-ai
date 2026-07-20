import { SmoochMessage } from '../../zendesk/client'
import { COACH_SYSTEM, buildCoachPrompt } from '../../prompts/coach'
import { stripPII } from '../../utils/pii'
import { getAnthropicClient } from '../../utils/anthropic'

const MAX_MESSAGES = 4

export interface CoachSuggestion {
  suggestion: string | null
  type: 'empathy' | 'efficiency' | 'positive' | null
}

function toTranscript(messages: SmoochMessage[]) {
  return messages
    .filter((m) => m.content.type === 'text' || m.content.type === 'formResponse')
    .map((m) => ({
      role: m.author.type === 'user' ? ('customer' as const) : ('engineer' as const),
      text: m.content.text ?? m.content.textFallback ?? '',
    }))
    .filter((m) => m.text.length > 0)
    .slice(-MAX_MESSAGES)
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function getCoachSuggestion(messages: SmoochMessage[]): Promise<CoachSuggestion> {
  const transcript = toTranscript(messages)

  if (transcript.length < 2) return { suggestion: null, type: null }

  const sanitized = transcript.map((m) => ({ ...m, text: stripPII(m.text) }))

  try {
    const client = await getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 120,
      system: COACH_SYSTEM,
      messages: [{ role: 'user', content: buildCoachPrompt(sanitized) }],
    })

    const block = response.content[0]
    if (block.type !== 'text') return { suggestion: null, type: null }

    const parsed = JSON.parse(stripFences(block.text)) as CoachSuggestion
    return parsed
  } catch {
    return { suggestion: null, type: null }
  }
}
