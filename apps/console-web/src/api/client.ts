import { createApiClient } from '@haruos/shared-utils';

const TOKEN_KEY = 'haruos_access_token';
const REFRESH_KEY = 'haruos_refresh_token';

/** localStorage 기반 토큰 관리 헬퍼. */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/**
 * console-web 전용 API 클라이언트.
 * shared-utils의 createApiClient를 사용하여 토큰 주입, 401 갱신, 에러 정규화를 처리한다.
 */
export const apiClient = createApiClient({
  baseURL: '/api',
  getAccessToken,
  getRefreshToken,
  onTokenRefreshed: (accessToken) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
  },
  onAuthFailed: () => {
    clearTokens();
    window.location.href = '/login';
  },
});
