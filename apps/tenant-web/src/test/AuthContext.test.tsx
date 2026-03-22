import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, AuthContext, type AuthState } from '../contexts/AuthContext';
import { useContext } from 'react';

vi.mock('../api/client', () => ({
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  saveTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

/** AuthContext 값을 표시하는 테스트용 컴포넌트. */
function AuthConsumer() {
  const ctx = useContext(AuthContext);
  if (!ctx) return <div>No context</div>;
  return (
    <div>
      <p data-testid="loading">{String(ctx.isLoading)}</p>
      <p data-testid="authenticated">{String(ctx.isAuthenticated)}</p>
      <p data-testid="user">{ctx.user ? ctx.user.name : 'null'}</p>
      <button
        onClick={() =>
          ctx.login('token-a', 'token-r', {
            id: '1',
            email: 'user@tenant.com',
            name: 'Tenant User',
            tenantId: 't1',
          })
        }
      >
        Login
      </button>
      <button onClick={ctx.logout}>Logout</button>
    </div>
  );
}

describe('AuthContext (tenant-web)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('초기 상태: 미인증', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('login 호출 시 인증 상태로 전환', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await user.click(screen.getByText('Login'));

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('Tenant User');
  });

  it('logout 후 미인증 상태', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await user.click(screen.getByText('Login'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

    await user.click(screen.getByText('Logout'));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });
});
