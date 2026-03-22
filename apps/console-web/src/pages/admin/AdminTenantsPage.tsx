import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { adminApi, type AdminTenant } from '../../api/admin.api';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  ACTIVE: 'success',
  CREATING: 'info',
  SUSPENDED: 'warning',
};

export function AdminTenantsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: adminApi.getTenants,
  });

  const suspendMutation = useMutation({
    mutationFn: adminApi.suspendTenant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: adminApi.resumeTenant,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const filtered = tenants.filter((t: AdminTenant) => {
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">테넌트 관리</h1>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="이름 또는 slug 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="ACTIVE">활성</option>
          <option value="CREATING">생성 중</option>
          <option value="SUSPENDED">일시 중지</option>
        </select>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">이름</th>
                <th className="px-4 py-3 font-medium text-gray-600">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-600">상태</th>
                <th className="px-4 py-3 font-medium text-gray-600">플랜</th>
                <th className="px-4 py-3 font-medium text-gray-600">리전</th>
                <th className="px-4 py-3 font-medium text-gray-600">생성일</th>
                <th className="px-4 py-3 font-medium text-gray-600">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                  <td className="px-4 py-3 text-gray-500">{tenant.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[tenant.status] ?? 'default'}>
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{tenant.plan}</td>
                  <td className="px-4 py-3 text-gray-500">{tenant.region}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(tenant.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    {tenant.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={suspendMutation.isPending}
                        onClick={() => suspendMutation.mutate(tenant.id)}
                      >
                        중지
                      </Button>
                    )}
                    {tenant.status === 'SUSPENDED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={resumeMutation.isPending}
                        onClick={() => resumeMutation.mutate(tenant.id)}
                      >
                        재개
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    테넌트가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
