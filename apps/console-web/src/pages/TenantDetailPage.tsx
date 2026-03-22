import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTenant, useUpdateTenant, useSuspendTenant, useResumeTenant } from '../hooks/useTenants';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatDate } from '@haruos/shared-utils';
import type { BadgeVariant } from '../types/ui';

function getStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'CREATING': return 'info';
    case 'SUSPENDED': return 'warning';
    default: return 'default';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE': return '활성';
    case 'CREATING': return '생성 중';
    case 'SUSPENDED': return '중지됨';
    default: return status;
  }
}

type Tab = 'info' | 'monitoring' | 'settings';

/** 테넌트 상세 페이지. 정보/모니터링/설정 탭 구성. */
export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: tenant, isLoading, error } = useTenant(id!);
  const updateTenant = useUpdateTenant();
  const suspendTenant = useSuspendTenant();
  const resumeTenant = useResumeTenant();
  const [tab, setTab] = useState<Tab>('info');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
        프로젝트를 불러오는데 실패했습니다.
      </div>
    );
  }

  function startEditing() {
    if (!tenant) return;
    setEditName(tenant.name);
    setEditDesc(tenant.description || '');
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!tenant) return;
    await updateTenant.mutateAsync({
      id: tenant.id,
      params: { name: editName, description: editDesc },
    });
    setIsEditing(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: '정보' },
    { key: 'monitoring', label: '모니터링' },
    { key: 'settings', label: '설정' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; 목록
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
        <Badge variant={getStatusVariant(tenant.status)}>
          {getStatusLabel(tenant.status)}
        </Badge>
      </div>

      {/* 탭 */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 정보 탭 */}
      {tab === 'info' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>프로젝트 정보</CardTitle>
              <div className="flex gap-2">
                {tenant.status === 'ACTIVE' && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={suspendTenant.isPending}
                    onClick={() => suspendTenant.mutate(tenant.id)}
                  >
                    일시 중지
                  </Button>
                )}
                {tenant.status === 'SUSPENDED' && (
                  <Button
                    size="sm"
                    loading={resumeTenant.isPending}
                    onClick={() => resumeTenant.mutate(tenant.id)}
                  >
                    재개
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          {isEditing ? (
            <div className="space-y-4">
              <Input label="이름" value={editName} onChange={(e) => setEditName(e.target.value)} />
              <Input label="설명" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" loading={updateTenant.isPending} onClick={saveEdit}>저장</Button>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)}>취소</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">슬러그</span>
                <span className="text-sm text-gray-900">{tenant.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">설명</span>
                <span className="text-sm text-gray-900">{tenant.description || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">플랜</span>
                <span className="text-sm text-gray-900">{tenant.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">리전</span>
                <span className="text-sm text-gray-900">{tenant.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">생성일</span>
                <span className="text-sm text-gray-900">{formatDate(tenant.createdAt)}</span>
              </div>
              {tenant.trialEndsAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">체험 종료일</span>
                  <span className="text-sm text-gray-900">{formatDate(tenant.trialEndsAt)}</span>
                </div>
              )}
              <div className="pt-2">
                <Button variant="secondary" size="sm" onClick={startEditing}>
                  수정
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 모니터링 탭 - Task #4에서 구현 */}
      {tab === 'monitoring' && (
        <Link to={`/tenants/${tenant.id}/monitoring`}>
          <Card className="text-center py-8">
            <p className="text-gray-500">모니터링 페이지로 이동</p>
          </Card>
        </Link>
      )}

      {/* 설정 탭 - Task #4에서 구현 */}
      {tab === 'settings' && (
        <Link to={`/tenants/${tenant.id}/settings`}>
          <Card className="text-center py-8">
            <p className="text-gray-500">설정 페이지로 이동</p>
          </Card>
        </Link>
      )}
    </div>
  );
}
