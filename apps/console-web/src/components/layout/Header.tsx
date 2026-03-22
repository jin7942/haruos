import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

/** 상단 헤더 컴포넌트. 사용자 정보 및 로그아웃 버튼. */
export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600">{user.name}</span>
        )}
        <Button variant="ghost" size="sm" onClick={logout}>
          로그아웃
        </Button>
      </div>
    </header>
  );
}
