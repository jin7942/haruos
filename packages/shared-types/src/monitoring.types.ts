/** 메트릭 응답. */
export interface MetricResponse {
  id: string;
  tenantId: string;
  metricType: string;
  value: number;
  unit: string;
  collectedAt: string;
}

/** 비용 기록 응답. */
export interface CostResponse {
  id: string;
  tenantId: string;
  service: string;
  cost: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
}

/** AI 사용량 응답. */
export interface AiUsageResponse {
  id: string;
  tenantId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  collectedAt: string;
}

/** 알림 설정 응답. */
export interface AlertConfigResponse {
  id: string;
  tenantId: string;
  alertType: string;
  threshold: number;
  isEnabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}
