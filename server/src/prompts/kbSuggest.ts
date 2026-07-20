export const KB_SUGGEST_SYSTEM = `You are a knowledge base article writer for a WordPress support team. Given an investigation report, you write a clear, reusable internal KB article that documents the issue and resolution for future reference.`

export function buildKBSuggestPrompt(
  summary: string,
  hypothesis: string,
  steps: string[],
): string {
  return `Investigation Summary: ${summary}

Root Cause / Hypothesis: ${hypothesis}

Recommended Steps:
${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Write a concise internal KB article about this issue. Return a JSON object:
{
  "title": "Short descriptive title (max 80 chars)",
  "content": "Full article text in plain prose. Include: what the issue is, what causes it, and how to resolve it. Written for support engineers, not customers. No markdown headers."
}

Return only the JSON object, no fences.`
}
