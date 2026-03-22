import { useBatchJobs, useTriggerBatchJob } from '../hooks/useBatch';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';

/** 배치 작업 관리 페이지. 등록된 배치 작업 목록 조회 및 수동 실행. */
export function BatchPage() {
  const { data: jobs, isLoading } = useBatchJobs();
  const triggerJob = useTriggerBatchJob();

  const statusColors: Record<string, string> = {
    SUCCESS: 'bg-green-50 text-green-700',
    FAILED: 'bg-red-50 text-red-700',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">배치 작업</h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : !jobs?.length ? (
        <p className="text-center text-gray-400 py-8">등록된 배치 작업이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{job.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${job.isEnabled ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      {job.isEnabled ? '활성' : '비활성'}
                    </span>
                    {job.lastRunStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[job.lastRunStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                        {job.lastRunStatus}
                      </span>
                    )}
                  </div>
                  {job.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{job.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    <span className="font-mono">{job.cronExpression}</span>
                    {job.lastRunAt && (
                      <span className="ml-3">
                        최근 실행: {new Date(job.lastRunAt).toLocaleString('ko-KR')}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 ml-4">
                  <Button
                    onClick={() => triggerJob.mutate(job.id)}
                    variant="secondary"
                    size="sm"
                    disabled={triggerJob.isPending}
                  >
                    실행
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
