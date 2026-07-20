// Card before token so digit runs don't survive as [TOKEN] matches
export function stripPII(text: string): string {
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]')
    .replace(/\b(?:\d[ -]?){13,16}\b/g, '[CARD]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]')
    .replace(/\b[a-zA-Z0-9_-]{32,}\b/g, '[TOKEN]')
}
