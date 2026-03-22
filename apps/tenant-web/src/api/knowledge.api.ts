import type { KnowledgeSearchResponse, KnowledgeAskResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 지식을 검색한다. */
export function searchKnowledge(query: string, limit?: number): Promise<KnowledgeSearchResponse[]> {
  return apiClient.get('/agents/knowledge/search', { params: { query, limit } }).then((r) => r.data);
}

/** RAG 기반 질의응답. */
export function askKnowledge(question: string): Promise<KnowledgeAskResponse> {
  return apiClient.post('/agents/knowledge/ask', { question }).then((r) => r.data);
}
