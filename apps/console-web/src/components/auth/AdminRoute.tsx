import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 관리자 전용 라우트.
 * ProtectedRoute 내부에서 사용. role이 'ADMIN'이 아니면 /dashboard로 리다이렉트.
 */
export function AdminRoute() {
  const { user } = useAuth();

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
