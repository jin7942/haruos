import type { KnowledgeSearchResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 지식을 검색한다. */
export function searchKnowledge(query: string, limit?: number): Promise<KnowledgeSearchResponse[]> {
  return apiClient.get('/agents/knowledge/search', { params: { query, limit } }).then((r) => r.data);
}
