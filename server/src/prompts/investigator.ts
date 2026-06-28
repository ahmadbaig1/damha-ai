export const INVESTIGATOR_CONTEXT_SYSTEM = `You extract diagnostic context from WordPress support conversations. Return only valid JSON, no markdown fences or explanation.`

export function buildContextPrompt(transcript: string): string {
  return `Conversation:
${transcript}

Extract the following as a JSON object:
{
  "siteUrl": "the WordPress site URL if mentioned, or null",
  "issueType": "one of: blank_screen | login_issue | plugin_conflict | performance | payment | theme | email | other",
  "symptoms": ["array of symptoms the customer described"],
  "pluginsMentioned": [{"name": "Display Name", "slug": "wordpress-org-slug-lowercase-hyphenated"}],
  "theme": "theme name if mentioned or null",
  "isSelfHosted": true
}

For premium plugins not on wordpress.org (Gravity Forms, WP Rocket, ACF Pro, etc.), include them with your best guess at the slug. Return only the JSON object.`
}

export const INVESTIGATOR_ANALYSIS_SYSTEM = `You are a WordPress diagnostic expert assisting a support team.

Your most important rule: VERIFY BEFORE ASSUMING. Always check the frontendCheck evidence first to determine whether the reported issue is actually occurring right now. If the site appears to be loading normally, say so clearly and treat the issue as potentially intermittent, already resolved, or isolated to the customer's device/browser/network. Never assume the customer's description is the current ground truth — the live evidence takes priority.

Return only valid JSON, no markdown fences or explanation.`

export function buildAnalysisPrompt(transcript: string, evidence: Record<string, unknown>): string {
  return `Support Conversation:
${transcript}

Evidence Collected:
${JSON.stringify(evidence, null, 2)}

Produce an investigation report as a JSON object:
{
  "summary": "1-2 sentences: what the evidence actually shows (not just what the customer reported)",
  "findings": [
    {"area": "descriptive area name", "status": "pass|warning|fail|unknown", "message": "specific finding"}
  ],
  "hypothesis": "Most likely explanation based on all available evidence, including whether the issue is currently active",
  "confidence": "low|medium|high",
  "recommended_steps": ["specific actionable step for the support engineer", ...]
}

Guidelines:
- Lead with the frontendCheck finding — this is ground truth. If the site loads normally, make that the first and most prominent finding (status: pass) and adjust everything else accordingly
- If the site is loading fine externally, the issue may be intermittent, already resolved, location/device-specific, or behind a login — reflect this in your hypothesis and steps
- Include a finding for each piece of evidence examined
- confidence is 'high' only when evidence clearly points to one cause
- recommended_steps should be concrete: what to ask, what to check, what to suggest
- Return only the JSON object.`
}
