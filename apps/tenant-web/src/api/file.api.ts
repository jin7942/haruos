import type { FileRecordResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 파일 정리 결과 */
export interface OrganizeFilesResult {
  organized: number;
  skipped: number;
  extracted: number;
  errors: string[];
}

/** 파일 목록을 조회한다. */
export function getFiles(): Promise<FileRecordResponse[]> {
  return apiClient.get('/agents/files').then((r) => r.data);
}

/** 파일을 업로드한다. */
export function uploadFile(file: File): Promise<FileRecordResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient
    .post('/agents/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}

/** 파일 다운로드 URL을 조회한다. */
export function getFileUrl(id: string): Promise<{ url: string }> {
  return apiClient.get(`/agents/files/${id}/url`).then((r) => r.data);
}

/** 파일을 삭제한다. */
export function deleteFile(id: string): Promise<void> {
  return apiClient.delete(`/agents/files/${id}`).then(() => undefined);
}

/** 파일 자동 정리를 실행한다. */
export function organizeFiles(userId?: string): Promise<OrganizeFilesResult> {
  return apiClient.post('/agents/files/organize', { userId }).then((r) => r.data);
}

/** 카테고리별 파일 요약을 조회한다. */
export function getCategorySummary(): Promise<Record<string, number>> {
  return apiClient.get('/agents/files/summary').then((r) => r.data);
}
