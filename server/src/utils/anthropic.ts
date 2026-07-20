import Anthropic from '@anthropic-ai/sdk'
import { getOrgSettings } from '../db/orgSettings'

let _cached: { key: string; client: Anthropic } | null = null

export async function getAnthropicClient(): Promise<Anthropic> {
  const settings = await getOrgSettings()
  const key = settings.anthropicKey ?? process.env.ANTHROPIC_API_KEY ?? ''

  if (_cached && _cached.key === key) return _cached.client

  const client = new Anthropic({ apiKey: key })
  _cached = { key, client }
  return client
}
