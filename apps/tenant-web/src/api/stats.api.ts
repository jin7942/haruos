import { apiClient } from './client';

/** 대시보드 통계 응답 타입. */
export interface DashboardStatsResponse {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  todayMessages: number;
  activeBatchJobs: number;
  totalDocuments: number;
}

/** AI 사용량 통계 응답 타입. */
export interface AiUsageStatsResponse {
  totalRequests: number;
  totalTokens: number;
  averageTokensPerRequest: number;
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
  }>;
}

/** 대시보드 통계를 조회한다. */
export function getDashboardStats(): Promise<DashboardStatsResponse> {
  return apiClient.get('/stats/dashboard').then((r) => r.data);
}

/** AI 사용량 통계를 조회한다. */
export function getAiUsageStats(): Promise<AiUsageStatsResponse> {
  return apiClient.get('/stats/ai-usage').then((r) => r.data);
}
