import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { UserSummary } from '@haruos/shared-types';
import { authApi, type LoginParams, type SignupParams } from '../api/auth.api';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../api/client';

interface AuthState {
  user: UserSummary | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (params: LoginParams) => Promise<void>;
  signup: (params: SignupParams) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 인증 상태를 관리하는 Provider.
 * localStorage에 저장된 토큰으로 인증 상태를 복원한다.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // 초기 로드: localStorage에서 토큰 확인
  useEffect(() => {
    const token = getAccessToken();
    const savedUser = localStorage.getItem('haruos_user');
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser) as UserSummary;
        setState({ user, isAuthenticated: true, isLoading: false });
      } catch {
        clearTokens();
        localStorage.removeItem('haruos_user');
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const login = useCallback(async (params: LoginParams) => {
    const response = await authApi.login(params);
    setTokens(response.accessToken, response.refreshToken);
    localStorage.setItem('haruos_user', JSON.stringify(response.user));
    setState({ user: response.user, isAuthenticated: true, isLoading: false });
  }, []);

  const signup = useCallback(async (params: SignupParams) => {
    await authApi.signup(params);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    localStorage.removeItem('haruos_user');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * AuthContext를 사용하는 훅.
 * AuthProvider 내부에서만 사용 가능.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
