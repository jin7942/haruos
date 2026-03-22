import type { FileRecordResponse } from '@haruos/shared-types';
import { apiClient } from './client';

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
