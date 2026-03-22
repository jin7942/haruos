import { useState } from 'react';
import type { ProvisioningJobResponse, ProvisioningLogResponse } from '@haruos/shared-types';
import {
  useProvisioningStatus,
  useProvisioningStream,
  useStartProvisioning,
  useRollbackProvisioning,
} from '../../hooks/useProvisioner';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { BadgeVariant } from '../../types/ui';

interface ProvisioningPanelProps {
  tenantId: string;
}

const STEP_LABELS: Record<string, string> = {
  TERRAFORM_PLAN: 'Terraform 계획',
  TERRAFORM_APPLY: 'Terraform 적용',
  ANSIBLE_SETUP: 'Ansible 설정',
  DNS_SETUP: 'DNS 설정',
  HEALTH_CHECK: '헬스체크',
};

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'IN_PROGRESS': return 'info';
    case 'FAILED': return 'danger';
    case 'ROLLING_BACK': return 'warning';
    case 'ROLLED_BACK': return 'warning';
    default: return 'default';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING': return '대기';
    case 'IN_PROGRESS': return '진행 중';
    case 'COMPLETED': return '완료';
    case 'FAILED': return '실패';
    case 'ROLLING_BACK': return '롤백 중';
    case 'ROLLED_BACK': return '롤백 완료';
    default: return status;
  }
}

/**
 * 프로비저닝 상태 패널.
 * SSE 스트리밍을 사용하여 프로비저닝 진행 상황을 실시간으로 표시한다.
 */
export function ProvisioningPanel({ tenantId }: ProvisioningPanelProps) {
  const { data: initialStatus } = useProvisioningStatus(tenantId);
  const startProvisioning = useStartProvisioning();
  const rollback = useRollbackProvisioning();

  // IN_PROGRESS 상태일 때만 SSE 연결
  const isInProgress = initialStatus?.status === 'IN_PROGRESS' || initialStatus?.status === 'PENDING';
  const { status: streamStatus, logs, isConnected } = useProvisioningStream(tenantId, isInProgress);

  // 스트리밍 상태가 있으면 우선, 아니면 초기 상태
  const job = streamStatus || initialStatus;

  if (!job) {
    return (
      <Card>
        <CardHeader><CardTitle>프로비저닝</CardTitle></CardHeader>
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-4">프로비저닝 내역이 없습니다.</p>
          <Button
            loading={startProvisioning.isPending}
            onClick={() => startProvisioning.mutate(tenantId)}
          >
            프로비저닝 시작
          </Button>
        </div>
      </Card>
    );
  }

  const progress = job.totalSteps > 0
    ? Math.round((job.completedSteps / job.totalSteps) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>프로비저닝</CardTitle>
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                실시간
              </span>
            )}
            <Badge variant={getStatusVariant(job.status)}>
              {getStatusLabel(job.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {/* 진행률 바 */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{job.currentStep ? STEP_LABELS[job.currentStep] || job.currentStep : '-'}</span>
          <span>{job.completedSteps}/{job.totalSteps} 단계 ({progress}%)</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              job.status === 'FAILED' ? 'bg-red-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 에러 메시지 */}
      {job.errorMessage && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {job.errorMessage}
        </div>
      )}

      {/* 실시간 로그 */}
      {logs.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">실시간 로그</h4>
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-900 p-3 text-xs font-mono text-gray-300 space-y-1">
            {logs.map((log, i) => (
              <div key={log.id || i} className="flex gap-2">
                <span className={`${
                  log.status === 'COMPLETED' ? 'text-green-400' :
                  log.status === 'FAILED' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  [{log.status}]
                </span>
                <span className="text-gray-400">{STEP_LABELS[log.step] || log.step}</span>
                {log.message && <span className="text-gray-500">- {log.message}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      {job.status === 'FAILED' && (
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            loading={rollback.isPending}
            onClick={() => rollback.mutate(tenantId)}
          >
            롤백
          </Button>
          <Button
            size="sm"
            loading={startProvisioning.isPending}
            onClick={() => startProvisioning.mutate(tenantId)}
          >
            재시도
          </Button>
        </div>
      )}
    </Card>
  );
}
