import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { adminApi } from '../../api/admin.api';

const STAT_CARDS = [
  { key: 'totalTenants', label: '전체 테넌트', color: 'text-gray-900' },
  { key: 'activeTenants', label: '활성', color: 'text-green-600' },
  { key: 'trialTenants', label: '트라이얼', color: 'text-blue-600' },
  { key: 'suspendedTenants', label: '일시 중지', color: 'text-orange-600' },
  { key: 'totalUsers', label: '전체 사용자', color: 'text-gray-900' },
  { key: 'verifiedUsers', label: '인증 완료', color: 'text-green-600' },
  { key: 'activeSubscriptions', label: '활성 구독', color: 'text-purple-600' },
] as const;

export function AdminDashboardPage() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminApi.getDashboard,
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
      <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, color }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${color}`}>
                {dashboard?.[key] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
