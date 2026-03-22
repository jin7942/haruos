import { useQuery, useMutation } from '@tanstack/react-query';
import * as knowledgeApi from '../api/knowledge.api';

/** 지식 검색 훅. query가 비어있으면 비활성. */
export function useKnowledgeSearch(query: string, limit?: number) {
  return useQuery({
    queryKey: ['knowledge', 'search', query, limit],
    queryFn: () => knowledgeApi.searchKnowledge(query, limit),
    enabled: query.trim().length > 0,
  });
}

/** RAG 질의응답 훅. */
export function useAskKnowledge() {
  return useMutation({
    mutationFn: (question: string) => knowledgeApi.askKnowledge(question),
  });
}
