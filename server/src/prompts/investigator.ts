export const ASK_SYSTEM = `You are Auxly, an AI assistant embedded in a support engineer's workspace. You are talking TO THE ENGINEER, not to the customer. Answer the engineer's question concisely based on the current support conversation. Be direct and practical. Keep answers under 150 words unless detail is essential. Do not use markdown headers — plain paragraphs and bullet points only. Never tell the engineer to "check the website" or ask the customer something — you are answering the engineer's question about the ticket.`

export function buildAskPrompt(transcript: string, question: string): string {
  return `Support conversation:
${transcript}

Engineer's question: ${question}

Answer the question based on the conversation context above.`
}

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

If internalKnowledge is present in the evidence, treat those articles as authoritative internal references. Cite article titles in your hypothesis and recommended_steps where relevant.

Bug detection: If the issue is a confirmed product bug (site error not caused by user config, no user action can fix it, reproducible from evidence), set issueSeverity to "confirmed-bug" and populate suggestedIssueTitle (max 80 chars) and suggestedIssueBody (markdown: Summary, Steps to Reproduce, Evidence, Expected vs Actual). Otherwise set issueSeverity to "none" and leave the title/body empty.

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
  "recommended_steps": ["specific actionable step for the support engineer", ...],
  "issueSeverity": "none|confirmed-bug",
  "suggestedIssueTitle": "max 80-char title if confirmed-bug, else empty string",
  "suggestedIssueBody": "markdown bug report if confirmed-bug, else empty string"
}

Guidelines:
- Lead with the frontendCheck finding — this is ground truth. If the site loads normally, make that the first and most prominent finding (status: pass) and adjust everything else accordingly
- If the site is loading fine externally, the issue may be intermittent, already resolved, location/device-specific, or behind a login — reflect this in your hypothesis and steps
- If internalKnowledge articles are present in evidence, reference them by title in your hypothesis or steps
- Include a finding for each piece of evidence examined
- confidence is 'high' only when evidence clearly points to one cause
- recommended_steps should be concrete: what to ask, what to check, what to suggest
- Return only the JSON object.`
}

export function buildChallengePrompt(
  transcript: string,
  originalReport: { summary: string; hypothesis: string; findings: unknown[]; recommended_steps: string[]; confidence: string },
  challenge: string,
): string {
  return `Support Conversation:
${transcript}

Original Investigation Report:
${JSON.stringify(originalReport, null, 2)}

The support engineer has challenged this assessment with the following input:
"${challenge}"

Re-evaluate the report in light of this new information. If the engineer's input changes your diagnosis, update the affected fields. If it does not change your conclusion, explain why in the hypothesis field and keep the original findings.

Return the same JSON schema as before, updated where appropriate. Return only the JSON object.`
}
