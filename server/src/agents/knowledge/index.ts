import { knowledgeConnector, KnowledgeResult } from '../../connectors/knowledge'

export async function searchKnowledge(query: string): Promise<KnowledgeResult[]> {
  return knowledgeConnector.search(query, 5).catch(() => [])
}
