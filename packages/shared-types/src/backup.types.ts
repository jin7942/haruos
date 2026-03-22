/** 백업 응답. */
export interface BackupResponse {
  id: string;
  tenantId: string;
  type: string;
  status: string;
  sizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** 백업 다운로드 URL 응답. */
export interface BackupDownloadResponse {
  url: string;
  expiresIn: number;
}
