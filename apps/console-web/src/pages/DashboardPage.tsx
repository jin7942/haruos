import { Link } from 'react-router-dom';
import { useTenants } from '../hooks/useTenants';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate } from '@haruos/shared-utils';
import { getTenantStatusVariant, getTenantStatusLabel } from '../lib/tenant-status';

/** 대시보드 페이지. 테넌트 목록을 카드로 표시한다. */
export function DashboardPage() {
  const { data: tenants, isLoading, error } = useTenants();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">내 프로젝트</h1>
        <Link to="/tenants/new">
          <Button>+ 새 프로젝트</Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          프로젝트 목록을 불러오는데 실패했습니다.
        </div>
      )}

      {tenants && tenants.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-500">아직 프로젝트가 없습니다.</p>
          <Link to="/tenants/new">
            <Button className="mt-4">첫 프로젝트 만들기</Button>
          </Link>
        </Card>
      )}

      {tenants && tenants.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Link key={tenant.id} to={`/tenants/${tenant.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{tenant.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{tenant.slug}</p>
                  </div>
                  <Badge variant={getTenantStatusVariant(tenant.status)}>
                    {getTenantStatusLabel(tenant.status)}
                  </Badge>
                </div>
                {tenant.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">{tenant.description}</p>
                )}
                <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                  <span>{tenant.region}</span>
                  <span>{formatDate(tenant.createdAt)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
