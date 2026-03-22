/** 프로비저닝 작업 응답. */
export interface ProvisioningJobResponse {
  id: string;
  tenantId: string;
  status: string;
  currentStep: string | null;
  totalSteps: number;
  completedSteps: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

/** 프로비저닝 로그 응답. */
export interface ProvisioningLogResponse {
  id: string;
  jobId: string;
  step: string;
  status: string;
  message: string | null;
  detail: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
