import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '../api/monitoring.api';

/** 테넌트 메트릭 조회 훅. */
export function useMetrics(tenantId: string) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'metrics'],
    queryFn: () => monitoringApi.findMetrics(tenantId),
    enabled: !!tenantId,
  });
}

/** 테넌트 비용 조회 훅. */
export function useCosts(tenantId: string) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'costs'],
    queryFn: () => monitoringApi.findCosts(tenantId),
    enabled: !!tenantId,
  });
}

/** 테넌트 AI 사용량 조회 훅. */
export function useAiUsage(tenantId: string) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'ai-usage'],
    queryFn: () => monitoringApi.findAiUsage(tenantId),
    enabled: !!tenantId,
  });
}
