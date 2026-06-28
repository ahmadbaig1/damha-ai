export const MOOD_SYSTEM = `You assess customer sentiment in support conversations. Return only valid JSON, no markdown.`

export function buildMoodPrompt(transcript: string): string {
  return `Conversation:
${transcript}

Assess the customer's current mood as JSON. Weight the most recent messages most heavily.
{
  "score": <integer 0-100 where 0=very frustrated/angry, 50=neutral, 100=very satisfied/happy>,
  "label": "<one of: frustrated | upset | neutral | calm | satisfied>"
}

Return only the JSON object.`
}
