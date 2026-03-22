import type { BackupResponse, BackupDownloadResponse } from '@haruos/shared-types';
import { apiClient } from './client';

export const backupApi = {
  /** 백업 목록 조회. */
  findAll: (tenantId: string) =>
    apiClient.get<BackupResponse[]>(`/tenants/${tenantId}/backups`).then((r) => r.data),

  /** 백업 시작. */
  create: (tenantId: string) =>
    apiClient.post<BackupResponse>(`/tenants/${tenantId}/backups`).then((r) => r.data),

  /** 백업 다운로드 URL 조회. */
  getDownloadUrl: (tenantId: string, backupId: string) =>
    apiClient.get<BackupDownloadResponse>(`/tenants/${tenantId}/backups/${backupId}/download`).then((r) => r.data),

  /** 데이터 내보내기. */
  exportData: (tenantId: string) =>
    apiClient.post<BackupResponse>(`/tenants/${tenantId}/backups/export`).then((r) => r.data),
};
