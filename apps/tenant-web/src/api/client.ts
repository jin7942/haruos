import { createApiClient } from '@haruos/shared-utils';

const TOKEN_KEY = 'haruos_access_token';
const REFRESH_KEY = 'haruos_refresh_token';

/** 토큰을 로컬 스토리지에 저장한다. */
export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

/** 저장된 토큰을 제거한다. */
export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Access Token을 반환한다. */
export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Refresh Token을 반환한다. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

/** tenant-api 클라이언트 인스턴스. */
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
