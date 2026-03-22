import { useQuery } from '@tanstack/react-query';
import * as statsApi from '../api/stats.api';

/** 대시보드 통계를 조회하는 훅. */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['stats', 'dashboard'],
    queryFn: statsApi.getDashboardStats,
    staleTime: 60_000,
  });
}

/** AI 사용량 통계를 조회하는 훅. */
export function useAiUsageStats() {
  return useQuery({
    queryKey: ['stats', 'ai-usage'],
    queryFn: statsApi.getAiUsageStats,
    staleTime: 60_000,
  });
}
