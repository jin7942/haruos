import type { DocumentResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 문서 목록을 조회한다. */
export function getDocuments(type?: string): Promise<DocumentResponse[]> {
  return apiClient.get('/agents/documents', { params: { type } }).then((r) => r.data);
}

/** 문서를 생성한다. */
export function createDocument(data: {
  title: string;
  content?: string;
  type: string;
}): Promise<DocumentResponse> {
  return apiClient.post('/agents/documents', data).then((r) => r.data);
}

/** 문서를 수정한다. */
export function updateDocument(
  id: string,
  data: { title?: string; content?: string },
): Promise<DocumentResponse> {
  return apiClient.patch(`/agents/documents/${id}`, data).then((r) => r.data);
}

/** 문서를 AI로 요약한다. */
export function summarizeDocument(id: string): Promise<{ summary: string }> {
  return apiClient.post(`/agents/documents/${id}/summarize`).then((r) => r.data);
}

/** 문서에서 Action Item을 추출한다. */
export function extractActionItems(id: string): Promise<{ actionItems: string[] }> {
  return apiClient.post(`/agents/documents/${id}/action-items`).then((r) => r.data);
}
