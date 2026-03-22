import { apiClient } from './client';

/** 배치 작업 응답 타입. */
export interface BatchJobResponse {
  id: string;
  name: string;
  description: string | null;
  cronExpression: string;
  isEnabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  createdAt: string;
}

/** 배치 작업 목록을 조회한다. */
export function getBatchJobs(): Promise<BatchJobResponse[]> {
  return apiClient.get('/batch/jobs').then((r) => r.data);
}

/** 배치 작업을 수동으로 즉시 실행한다. */
export function triggerBatchJob(id: string): Promise<BatchJobResponse> {
  return apiClient.post(`/batch/jobs/${id}/trigger`).then((r) => r.data);
}
