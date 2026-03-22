import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/tenants/new', label: '새 프로젝트', icon: 'M12 4v16m8-8H4' },
];

const ADMIN_ITEMS = [
  { to: '/admin/dashboard', label: '관리자 대시보드', icon: 'M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5' },
  { to: '/admin/tenants', label: '테넌트 관리', icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21' },
  { to: '/admin/users', label: '사용자 관리', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
];

const BOTTOM_ITEMS = [
  { to: '/account', label: '계정 설정', icon: 'M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z' },
  { to: '/account/billing', label: '빌링', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z' },
];

/** NavLink 공통 스타일을 반환한다. */
function navLinkClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-50 text-blue-700'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
  }`;
}

/** 아이콘 + 라벨 NavLink를 렌더링한다. */
function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink key={to} to={to} className={navLinkClass}>
      <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      {label}
    </NavLink>
  );
}

/** 사이드바 네비게이션 컴포넌트. */
export function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <h1 className="text-xl font-bold text-gray-900">HaruOS</h1>
      </div>
      <nav className="flex flex-1 flex-col px-3 py-4">
        <div className="flex-1 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          {isAdmin && (
            <>
              <div className="pb-1 pt-4">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  관리자
                </span>
              </div>
              {ADMIN_ITEMS.map((item) => (
                <NavItem key={item.to} {...item} />
              ))}
            </>
          )}
        </div>
        <div className="space-y-1 border-t border-gray-200 pt-4">
          {BOTTOM_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
