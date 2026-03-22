import { useDashboardStats, useAiUsageStats } from '../hooks/useStats';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

/** 대시보드 페이지. 주요 통계와 AI 사용량을 표시한다. */
export function DashboardPage() {
  const { data: dashboard, isLoading: dashLoading } = useDashboardStats();
  const { data: aiUsage, isLoading: aiLoading } = useAiUsageStats();

  if (dashLoading || aiLoading) {
    return (
      <div className="flex justify-center py-16"><Spinner /></div>
    );
  }

  const statCards = [
    { label: '총 대화', value: dashboard?.totalConversations ?? 0 },
    { label: '총 메시지', value: dashboard?.totalMessages ?? 0 },
    { label: '오늘 메시지', value: dashboard?.todayMessages ?? 0 },
    { label: '총 토큰', value: (dashboard?.totalTokens ?? 0).toLocaleString() },
    { label: '활성 배치', value: dashboard?.activeBatchJobs ?? 0 },
    { label: '총 문서', value: dashboard?.totalDocuments ?? 0 },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-900">대시보드</h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI 사용량 */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">AI 사용량 (최근 7일)</h3>
        </CardHeader>
        <CardContent>
          {!aiUsage?.dailyUsage?.length ? (
            <p className="text-sm text-gray-400 text-center py-4">사용 기록이 없습니다</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500 border-b border-gray-100 pb-1">
                <span>날짜</span>
                <span>요청 수</span>
                <span>토큰</span>
              </div>
              {aiUsage.dailyUsage.map((day) => (
                <div key={day.date} className="flex justify-between text-sm">
                  <span className="text-gray-700">{day.date}</span>
                  <span className="text-gray-600">{day.requests}</span>
                  <span className="text-gray-600">{day.tokens.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-medium border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-900">합계</span>
                <span className="text-gray-900">{aiUsage.totalRequests}</span>
                <span className="text-gray-900">{aiUsage.totalTokens.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                평균 {aiUsage.averageTokensPerRequest.toLocaleString()} 토큰/요청
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
