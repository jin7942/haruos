import { useQuery } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { adminApi } from '../../api/admin.api';

export function AdminUsersPage() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminApi.getUsers,
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
      <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">이름</th>
                <th className="px-4 py-3 font-medium text-gray-600">이메일</th>
                <th className="px-4 py-3 font-medium text-gray-600">역할</th>
                <th className="px-4 py-3 font-medium text-gray-600">이메일 인증</th>
                <th className="px-4 py-3 font-medium text-gray-600">최근 로그인</th>
                <th className="px-4 py-3 font-medium text-gray-600">가입일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                  <td className="px-4 py-3 text-gray-500">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.role === 'ADMIN' ? 'danger' : 'default'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.isEmailVerified ? (
                      <span className="text-green-600">완료</span>
                    ) : (
                      <span className="text-gray-400">미인증</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    사용자가 없습니다.
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
