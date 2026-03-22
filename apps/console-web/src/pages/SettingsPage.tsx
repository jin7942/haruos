import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { useCfnTemplateUrl, useCfnLaunchUrl, useAwsCredential, useValidateAws } from '../hooks/useAws';
import { useDomains, useCreateDomain, useDeleteDomain, useVerifyDns } from '../hooks/useDomains';
import {
  useSubscription,
  useCancelSubscription,
  useCreateCheckoutSession,
  useCreatePortalSession,
  useInvoices,
} from '../hooks/useBilling';
import { useBackups, useCreateBackup, useBackupDownload, useExportData } from '../hooks/useBackups';
import { formatDate } from '@haruos/shared-utils';
import type { BadgeVariant } from '../types/ui';

type SettingsTab = 'aws' | 'domains' | 'billing' | 'backup';

/** 설정 페이지. AWS 연동, 도메인 관리, 빌링 탭. */
export function SettingsPage() {
  const { id: tenantId } = useParams<{ id: string }>();
  const [tab, setTab] = useState<SettingsTab>('aws');

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'aws', label: 'AWS 연동' },
    { key: 'domains', label: '도메인' },
    { key: 'billing', label: '빌링' },
    { key: 'backup', label: '백업' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link to={`/tenants/${tenantId}`} className="text-sm text-gray-500 hover:text-gray-700">
          &larr; 프로젝트
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      </div>

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

      {tab === 'aws' && <AwsTab tenantId={tenantId!} />}
      {tab === 'domains' && <DomainsTab tenantId={tenantId!} />}
      {tab === 'billing' && <BillingTab tenantId={tenantId!} />}
      {tab === 'backup' && <BackupTab tenantId={tenantId!} />}
    </div>
  );
}

/** AWS 연동 탭. 1클릭 CloudFormation 연동 + Role ARN 검증. */
function AwsTab({ tenantId }: { tenantId: string }) {
  const { data: cfn } = useCfnTemplateUrl(tenantId);
  const { data: launch } = useCfnLaunchUrl(tenantId);
  const { data: credential } = useAwsCredential(tenantId);
  const validateAws = useValidateAws();
  const [roleArn, setRoleArn] = useState('');
  const [externalId, setExternalId] = useState('');
  const [region, setRegion] = useState('ap-northeast-2');
  const [error, setError] = useState('');

  async function handleValidate() {
    setError('');
    if (!roleArn || !externalId) {
      setError('Role ARN과 External ID를 입력하세요.');
      return;
    }
    try {
      await validateAws.mutateAsync({
        tenantId,
        params: { roleArn, externalId, region },
      });
    } catch (err: unknown) {
      setError((err as { message?: string }).message || '검증 실패');
    }
  }

  return (
    <div className="space-y-6">
      {/* 1클릭 AWS 연동 */}
      <Card>
        <CardHeader><CardTitle>1. AWS 연동 (1클릭)</CardTitle></CardHeader>
        <p className="mb-3 text-sm text-gray-600">
          버튼을 클릭하면 AWS Console이 열리고, CloudFormation 스택이 자동 구성됩니다.
          "Create stack"만 누르면 HaruOS에 필요한 IAM Role이 생성됩니다.
        </p>
        {launch ? (
          <div className="space-y-3">
            <Button
              onClick={() => window.open(launch.launchUrl, '_blank', 'noopener,noreferrer')}
              className="w-full"
            >
              1클릭으로 AWS 연동
            </Button>
            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <div>
                <span className="text-gray-500">External ID: </span>
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">{launch.externalId}</code>
              </div>
              <div>
                <span className="text-gray-500">Stack Name: </span>
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm">{launch.stackName}</code>
              </div>
            </div>
            {cfn && (
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-600">수동 설정 URL 보기</summary>
                <div className="mt-2 rounded-lg bg-gray-50 p-3 break-all">
                  <a
                    href={cfn.templateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    CloudFormation 템플릿 URL
                  </a>
                </div>
              </details>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">로딩 중...</p>
        )}
      </Card>

      {/* Role ARN 검증 */}
      <Card>
        <CardHeader><CardTitle>2. IAM Role ARN 검증</CardTitle></CardHeader>
        {credential ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={credential.status === 'VALIDATED' ? 'success' : 'warning'}>
                {credential.status}
              </Badge>
              <span className="text-sm text-gray-600">{credential.roleArn}</span>
            </div>
            <div className="text-xs text-gray-400">
              리전: {credential.region}
              {credential.validatedAt && ` | 검증: ${formatDate(credential.validatedAt)}`}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
            <Input
              label="IAM Role ARN"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/HaruOSRole"
            />
            <Input
              label="External ID"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder={cfn?.externalId || 'haruos-ext-...'}
            />
            <Input
              label="AWS 리전"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="ap-northeast-2"
            />
            <Button loading={validateAws.isPending} onClick={handleValidate}>
              검증
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function getDomainStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'PENDING_VERIFICATION': return 'warning';
    case 'FAILED': return 'danger';
    default: return 'default';
  }
}

/** 도메인 관리 탭. 도메인 목록, 추가/삭제, DNS 검증. */
function DomainsTab({ tenantId }: { tenantId: string }) {
  const { data: domains, isLoading } = useDomains(tenantId);
  const createDomain = useCreateDomain();
  const deleteDomain = useDeleteDomain();
  const verifyDns = useVerifyDns();
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [dnsProvider, setDnsProvider] = useState<'CLOUDFLARE' | 'ROUTE53' | 'MANUAL'>('MANUAL');
  const [error, setError] = useState('');

  async function handleAdd() {
    setError('');
    if (!newDomain) {
      setError('도메인을 입력하세요.');
      return;
    }
    try {
      await createDomain.mutateAsync({
        tenantId,
        params: { domain: newDomain, dnsProvider },
      });
      setNewDomain('');
      setShowAdd(false);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || '추가 실패');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>도메인 목록</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? '취소' : '+ 추가'}
          </Button>
        </div>
      </CardHeader>

      {showAdd && (
        <div className="mb-4 space-y-3 rounded-lg border border-gray-200 p-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          <Input
            label="도메인"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="haru.company.com"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">DNS 제공자</label>
            <select
              value={dnsProvider}
              onChange={(e) => setDnsProvider(e.target.value as typeof dnsProvider)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="MANUAL">수동 (CNAME)</option>
              <option value="CLOUDFLARE">Cloudflare</option>
              <option value="ROUTE53">Route 53</option>
            </select>
          </div>
          <Button size="sm" loading={createDomain.isPending} onClick={handleAdd}>
            도메인 추가
          </Button>
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-400">로딩 중...</p>}

      {domains && domains.length === 0 && (
        <p className="text-sm text-gray-400">등록된 도메인이 없습니다.</p>
      )}

      {domains && domains.length > 0 && (
        <div className="space-y-3">
          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{d.domain}</span>
                  <Badge variant={getDomainStatusVariant(d.status)}>{d.status}</Badge>
                  {d.isPrimary && <Badge variant="info">기본</Badge>}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {d.type} | {d.dnsProvider || '-'}
                  {d.cnameTarget && ` | CNAME: ${d.cnameTarget}`}
                </div>
              </div>
              <div className="flex gap-2">
                {d.status === 'PENDING_VERIFICATION' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={verifyDns.isPending}
                    onClick={() => verifyDns.mutate({ tenantId, domainId: d.id })}
                  >
                    DNS 검증
                  </Button>
                )}
                {d.type !== 'SYSTEM' && (
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleteDomain.isPending}
                    onClick={() => deleteDomain.mutate({ tenantId, domainId: d.id })}
                  >
                    삭제
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function getBackupStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'COMPLETED': return 'success';
    case 'IN_PROGRESS': return 'warning';
    case 'FAILED': return 'danger';
    default: return 'default';
  }
}

/** 백업 탭. 백업 생성, 목록, 다운로드, 데이터 내보내기. */
function BackupTab({ tenantId }: { tenantId: string }) {
  const { data: backups, isLoading } = useBackups(tenantId);
  const createBackup = useCreateBackup();
  const downloadBackup = useBackupDownload();
  const exportData = useExportData();

  async function handleDownload(backupId: string) {
    try {
      const result = await downloadBackup.mutateAsync({ tenantId, backupId });
      window.open(result.url, '_blank');
    } catch {
      // 에러는 mutation에서 처리
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>백업 관리</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={createBackup.isPending}
                onClick={() => createBackup.mutate(tenantId)}
              >
                백업 시작
              </Button>
              <Button
                variant="secondary"
                size="sm"
                loading={exportData.isPending}
                onClick={() => exportData.mutate(tenantId)}
              >
                데이터 내보내기
              </Button>
            </div>
          </div>
        </CardHeader>

        {isLoading && <p className="text-sm text-gray-400">로딩 중...</p>}

        {backups && backups.length === 0 && (
          <p className="text-sm text-gray-400">백업 이력이 없습니다.</p>
        )}

        {backups && backups.length > 0 && (
          <div className="space-y-3">
            {backups.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getBackupStatusVariant(b.status)}>{b.status}</Badge>
                    <span className="text-sm text-gray-600">{b.type}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {formatDate(b.createdAt)}
                    {b.sizeBytes != null && ` | ${Math.round(b.sizeBytes / 1024)} KB`}
                    {b.errorMessage && ` | ${b.errorMessage}`}
                  </div>
                </div>
                {b.status === 'COMPLETED' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={downloadBackup.isPending}
                    onClick={() => handleDownload(b.id)}
                  >
                    다운로드
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function getSubscriptionStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'ACTIVE': return 'success';
    case 'TRIAL': return 'info';
    case 'PAST_DUE': return 'warning';
    case 'CANCELLED':
    case 'EXPIRED': return 'danger';
    default: return 'default';
  }
}

/** 빌링 탭. 구독 상태, Stripe Checkout, 결제수단 변경, 인보이스 이력. */
function BillingTab({ tenantId }: { tenantId: string }) {
  const { data: subscription, isLoading } = useSubscription(tenantId);
  const { data: invoices } = useInvoices(tenantId);
  const cancelSub = useCancelSubscription();
  const checkout = useCreateCheckoutSession();
  const portal = useCreatePortalSession();

  if (isLoading) {
    return <Card><p className="text-sm text-gray-400">로딩 중...</p></Card>;
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader><CardTitle>구독</CardTitle></CardHeader>
        <p className="text-sm text-gray-500">활성 구독이 없습니다.</p>
      </Card>
    );
  }

  const currentUrl = window.location.href;

  return (
    <div className="space-y-6">
      {/* 구독 정보 */}
      <Card>
        <CardHeader><CardTitle>구독 정보</CardTitle></CardHeader>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">요금제</span>
            <span className="font-medium text-gray-900">
              {subscription.planType === 'YEARLY' ? '연간 ($190/yr)' : '월간 ($19/mo)'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">상태</span>
            <Badge variant={getSubscriptionStatusVariant(subscription.status)}>
              {subscription.status}
            </Badge>
          </div>
          {subscription.currentPeriodEnd && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">현재 주기 종료</span>
              <span className="text-gray-900">{formatDate(subscription.currentPeriodEnd)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">가입일</span>
            <span className="text-gray-900">{formatDate(subscription.createdAt)}</span>
          </div>

          {/* TRIAL 상태: 결제 등록 버튼 */}
          {subscription.status === 'TRIAL' && (
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <p className="text-sm text-gray-500">14일 무료 체험 중입니다. 결제를 등록하세요.</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  loading={checkout.isPending}
                  onClick={() => checkout.mutate({
                    tenantId,
                    priceId: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '',
                    successUrl: currentUrl,
                    cancelUrl: currentUrl,
                  })}
                >
                  월간 결제 ($19/mo)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={checkout.isPending}
                  onClick={() => checkout.mutate({
                    tenantId,
                    priceId: import.meta.env.VITE_STRIPE_PRICE_YEARLY || '',
                    successUrl: currentUrl,
                    cancelUrl: currentUrl,
                  })}
                >
                  연간 결제 ($190/yr)
                </Button>
              </div>
            </div>
          )}

          {/* ACTIVE/PAST_DUE 상태: 관리 버튼 */}
          {(subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE') && (
            <div className="flex gap-2 border-t border-gray-100 pt-3">
              <Button
                variant="secondary"
                size="sm"
                loading={portal.isPending}
                onClick={() => portal.mutate({ tenantId, returnUrl: currentUrl })}
              >
                결제수단 변경
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={cancelSub.isPending}
                onClick={() => {
                  if (window.confirm('구독을 취소하시겠습니까?')) {
                    cancelSub.mutate(tenantId);
                  }
                }}
              >
                구독 취소
              </Button>
            </div>
          )}

          {subscription.status === 'PAST_DUE' && (
            <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
              결제가 실패했습니다. 결제수단을 업데이트해 주세요.
            </div>
          )}
        </div>
      </Card>

      {/* 인보이스 이력 */}
      <Card>
        <CardHeader><CardTitle>결제 이력</CardTitle></CardHeader>
        {!invoices || invoices.length === 0 ? (
          <p className="text-sm text-gray-400">결제 이력이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>
                      {inv.status}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">
                      {inv.currency.toUpperCase()} {(inv.amountPaid / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {formatDate(inv.periodStart)} ~ {formatDate(inv.periodEnd)}
                    {inv.paidAt && ` | ${formatDate(inv.paidAt)}`}
                  </div>
                </div>
                {inv.invoiceUrl && (
                  <a
                    href={inv.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    영수증
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
