import type { MetricResponse, CostResponse, AiUsageResponse, AlertConfigResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 알림 설정 수정 파라미터. */
export interface UpdateAlertParams {
  threshold?: number;
  isEnabled?: boolean;
}

export const monitoringApi = {
  /** 테넌트 메트릭 조회. */
  findMetrics: (tenantId: string) =>
    apiClient.get<MetricResponse[]>(`/tenants/${tenantId}/metrics`).then((r) => r.data),

  /** 테넌트 비용 조회. */
  findCosts: (tenantId: string) =>
    apiClient.get<CostResponse[]>(`/tenants/${tenantId}/costs`).then((r) => r.data),

  /** 테넌트 서비스별 비용 상세. */
  findCostBreakdown: (tenantId: string) =>
    apiClient.get<CostResponse[]>(`/tenants/${tenantId}/costs/breakdown`).then((r) => r.data),

  /** 테넌트 AI 사용량 조회. */
  findAiUsage: (tenantId: string) =>
    apiClient.get<AiUsageResponse[]>(`/tenants/${tenantId}/ai-usage`).then((r) => r.data),

  /** 테넌트 알림 설정 목록. */
  findAlerts: (tenantId: string) =>
    apiClient.get<AlertConfigResponse[]>(`/tenants/${tenantId}/alerts`).then((r) => r.data),

  /** 알림 설정 수정. */
  updateAlert: (tenantId: string, alertId: string, params: UpdateAlertParams) =>
    apiClient.patch<AlertConfigResponse>(`/tenants/${tenantId}/alerts/${alertId}`, params).then((r) => r.data),
};
