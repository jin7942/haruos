import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// AuthContext를 직접 mock
vi.mock('../contexts/AuthContext', () => {
  let mockState = { user: null, isAuthenticated: false, isLoading: false, login: vi.fn(), signup: vi.fn(), logout: vi.fn() };
  return {
    useAuth: () => mockState,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    __setMockState: (state: typeof mockState) => { mockState = state; },
  };
});

import { ProtectedRoute } from '../components/auth/ProtectedRoute';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { __setMockState } = await import('../contexts/AuthContext') as any;

describe('ProtectedRoute', () => {
  it('미인증 시 /login으로 리다이렉트', () => {
    __setMockState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('인증 시 자식 컴포넌트 렌더링', () => {
    __setMockState({
      user: { id: '1', email: 'test@test.com', name: 'Test' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('로딩 중 스피너 표시', () => {
    __setMockState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // 스피너 (animate-spin 클래스)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
