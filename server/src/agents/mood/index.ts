import Anthropic from '@anthropic-ai/sdk'
import { SmoochMessage } from '../../zendesk/client'
import { MOOD_SYSTEM, buildMoodPrompt } from '../../prompts/mood'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MAX_MESSAGES = 8

export interface MoodResult {
  score: number
  label: string
}

function toTranscript(messages: SmoochMessage[]): string {
  return messages
    .filter((m) => m.content.type === 'text' || m.content.type === 'formResponse')
    .map((m) => {
      const role = m.author.type === 'user' ? 'Customer' : 'Agent'
      const text = m.content.text ?? m.content.textFallback ?? ''
      return text ? `${role}: ${text}` : null
    })
    .filter((l): l is string => l !== null)
    .slice(-MAX_MESSAGES)
    .join('\n')
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function assessMood(messages: SmoochMessage[]): Promise<MoodResult> {
  const transcript = toTranscript(messages)
  if (!transcript) return { score: 50, label: 'neutral' }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 60,
      system: MOOD_SYSTEM,
      messages: [{ role: 'user', content: buildMoodPrompt(transcript) }],
    })
    const block = response.content[0]
    if (block.type !== 'text') return { score: 50, label: 'neutral' }
    const parsed = JSON.parse(stripFences(block.text)) as MoodResult
    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      label: parsed.label,
    }
  } catch {
    return { score: 50, label: 'neutral' }
  }
}
