import { InvestigationReport } from '../investigator'
import { KB_SUGGEST_SYSTEM, buildKBSuggestPrompt } from '../../prompts/kbSuggest'
import { getAnthropicClient } from '../../utils/anthropic'

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

export async function suggestKBArticle(
  report: InvestigationReport,
): Promise<{ title: string; content: string }> {
  const client = await getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: KB_SUGGEST_SYSTEM,
    messages: [
      {
        role: 'user',
        content: buildKBSuggestPrompt(
          report.summary,
          report.hypothesis,
          report.recommended_steps,
        ),
      },
    ],
  })
  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response from Claude')
  return JSON.parse(stripFences(block.text)) as { title: string; content: string }
}
