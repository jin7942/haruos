import { useParams, Link } from 'react-router-dom';
import { useMetrics, useCosts, useAiUsage } from '../hooks/useMonitoring';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';

/** 모니터링 페이지. 메트릭, 비용, AI 사용량 카드를 표시한다. */
export function MonitoringPage() {
  const { id } = useParams<{ id: string }>();
  const { data: metrics, isLoading: metricsLoading } = useMetrics(id!);
  const { data: costs, isLoading: costsLoading } = useCosts(id!);
  const { data: aiUsage, isLoading: aiLoading } = useAiUsage(id!);

  const isLoading = metricsLoading || costsLoading || aiLoading;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link to={`/tenants/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; 프로젝트
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">모니터링</h1>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {!isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 메트릭 카드 */}
          <Card>
            <CardHeader><CardTitle>인프라 메트릭</CardTitle></CardHeader>
            {metrics && metrics.length > 0 ? (
              <div className="space-y-2">
                {metrics.map((m) => (
                  <div key={m.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{m.metricType}</span>
                    <span className="font-medium text-gray-900">
                      {m.value.toFixed(1)} {m.unit}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">데이터 없음</p>
            )}
          </Card>

          {/* 비용 카드 */}
          <Card>
            <CardHeader><CardTitle>비용 요약</CardTitle></CardHeader>
            {costs && costs.length > 0 ? (
              <div className="space-y-2">
                {costs.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm">
                    <span className="text-gray-500">{c.service}</span>
                    <span className="font-medium text-gray-900">
                      ${c.cost.toFixed(2)} {c.currency}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                  <span>합계</span>
                  <span>${costs.reduce((sum, c) => sum + c.cost, 0).toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">데이터 없음</p>
            )}
          </Card>

          {/* AI 사용량 카드 */}
          <Card>
            <CardHeader><CardTitle>AI 사용량</CardTitle></CardHeader>
            {aiUsage && aiUsage.length > 0 ? (
              <div className="space-y-2">
                {aiUsage.map((a) => (
                  <div key={a.id} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{a.modelId}</span>
                      <span className="font-medium text-gray-900">${a.estimatedCost.toFixed(4)}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      입력: {a.inputTokens.toLocaleString()} / 출력: {a.outputTokens.toLocaleString()} tokens
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">데이터 없음</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
