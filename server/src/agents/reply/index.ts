import { SmoochMessage } from '../../zendesk/client'
import { buildReplySystem, buildReplyUserPrompt, buildGreetingPrompt, buildComposeSystem, buildComposePrompt } from '../../prompts/reply'
import { getOrgToneConfig } from '../../db/orgSettings'
import { stripPII } from '../../utils/pii'
import { getAnthropicClient } from '../../utils/anthropic'

const MAX_MESSAGES = 6

function toTranscript(messages: SmoochMessage[]) {
  return messages
    .filter((m) => m.content.type === 'text' || m.content.type === 'formResponse')
    .map((m) => ({
      role: m.author.type === 'user' ? ('customer' as const) : ('agent' as const),
      text: m.content.text ?? m.content.textFallback ?? '',
    }))
    .filter((m) => m.text.length > 0)
    .slice(-MAX_MESSAGES)
}

export type ComposeResult =
  | { type: 'direct'; draft: string; polished: boolean }
  | { type: 'instruction'; draft: string; polished: true }

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function composeMessage(
  input: string,
  messages: SmoochMessage[],
): Promise<ComposeResult> {
  const tone = await getOrgToneConfig()
  const transcript = toTranscript(messages)
  const transcriptString = stripPII(
    transcript.map((m) => `${m.role === 'customer' ? 'Customer' : 'Agent'}: ${m.text}`).join('\n'),
  )

  const client = await getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: buildComposeSystem(tone),
    messages: [{ role: 'user', content: buildComposePrompt(input, transcriptString) }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response from Claude')
  const parsed = JSON.parse(stripFences(block.text)) as ComposeResult
  return parsed
}

export async function generateReplyDraft(
  messages: SmoochMessage[],
  investigationReport?: unknown,
  isGreeting?: boolean,
): Promise<string> {
  const tone = await getOrgToneConfig()
  const transcript = toTranscript(messages)

  if (transcript.length === 0) throw new Error('No readable messages to draft from')

  const transcriptString = stripPII(
    transcript.map((m) => `${m.role === 'customer' ? 'Customer' : 'Agent'}: ${m.text}`).join('\n'),
  )

  const userPrompt = isGreeting
    ? buildGreetingPrompt(transcriptString)
    : buildReplyUserPrompt(transcript, investigationReport)

  const client = await getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: isGreeting ? 120 : 400,
    system: buildReplySystem(tone),
    messages: [{ role: 'user', content: userPrompt }],
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text.trim()
}
