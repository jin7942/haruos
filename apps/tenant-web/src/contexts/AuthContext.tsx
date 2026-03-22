import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TenantUserSummary } from '@haruos/shared-types';
import { getAccessToken, saveTokens, clearTokens } from '../api/client';

export interface AuthState {
  /** 인증된 사용자 정보 */
  user: TenantUserSummary | null;
  /** 로딩 중 여부 */
  isLoading: boolean;
  /** 인증 여부 */
  isAuthenticated: boolean;
  /** 로그인 처리. 토큰 저장 + 사용자 정보 설정. */
  login: (accessToken: string, refreshToken: string, user: TenantUserSummary) => void;
  /** 로그아웃 처리. 토큰 제거 + 사용자 정보 초기화. */
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

const USER_KEY = 'haruos_user';

/** 인증 상태를 관리하는 Provider. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TenantUserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const savedUser = localStorage.getItem(USER_KEY);
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        clearTokens();
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string, u: TenantUserSummary) => {
    saveTokens(accessToken, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
