import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@haruos/shared-types';

/** API 에러 정규화 형식. */
export interface ApiError {
  code: string;
  message: string;
  status: number;
}

/** API 클라이언트 설정. */
export interface ApiClientOptions {
  /** 기본 URL */
  baseURL: string;
  /** Access Token 반환 함수 */
  getAccessToken: () => string | null;
  /** Refresh Token 반환 함수 */
  getRefreshToken: () => string | null;
  /** 토큰 갱신 후 저장 콜백 */
  onTokenRefreshed: (accessToken: string) => void;
  /** 인증 실패(refresh도 실패) 시 콜백 */
  onAuthFailed: () => void;
}

/**
 * Axios 기반 API 클라이언트를 생성한다.
 *
 * - Request 인터셉터: Authorization Bearer 토큰 자동 주입
 * - Response 인터셉터: ApiResponse에서 data 추출, 에러 정규화
 * - 401 발생 시 refresh 토큰으로 갱신 시도
 *
 * @param options - 클라이언트 설정
 * @returns Axios 인스턴스
 */
export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const instance = axios.create({
    baseURL: options.baseURL,
    headers: { 'Content-Type': 'application/json' },
  });

  // Request: Bearer 토큰 주입
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = options.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // 토큰 갱신 중복 방지
  let isRefreshing = false;
  let refreshSubscribers: Array<(token: string) => void> = [];

  function subscribeTokenRefresh(cb: (token: string) => void): void {
    refreshSubscribers.push(cb);
  }

  function onTokenRefreshed(token: string): void {
    refreshSubscribers.forEach((cb) => cb(token));
    refreshSubscribers = [];
  }

  // Response: data 추출 + 에러 정규화 + 401 갱신
  instance.interceptors.response.use(
    (response) => {
      const body = response.data as ApiResponse<unknown>;
      if (body && typeof body === 'object' && 'success' in body) {
        response.data = body.data;
      }
      return response;
    },
    async (error: AxiosError<ApiResponse<unknown>>) => {
      const originalRequest = error.config;
      if (!originalRequest) {
        return Promise.reject(normalizeError(error));
      }

      // 401이고 refresh 가능한 경우
      if (error.response?.status === 401) {
        const refreshToken = options.getRefreshToken();
        if (!refreshToken) {
          options.onAuthFailed();
          return Promise.reject(normalizeError(error));
        }

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const res = await axios.post<ApiResponse<{ accessToken: string }>>(
              `${options.baseURL}/auth/refresh`,
              { refreshToken },
            );
            const newToken = res.data.data.accessToken;
            options.onTokenRefreshed(newToken);
            onTokenRefreshed(newToken);
            isRefreshing = false;

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return instance(originalRequest);
          } catch {
            isRefreshing = false;
            refreshSubscribers = [];
            options.onAuthFailed();
            return Promise.reject(normalizeError(error));
          }
        }

        // 이미 갱신 중이면 대기
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(instance(originalRequest));
          });
        });
      }

      return Promise.reject(normalizeError(error));
    },
  );

  return instance;
}

/** AxiosError를 ApiError로 정규화한다. */
function normalizeError(error: AxiosError<ApiResponse<unknown>>): ApiError {
  if (error.response?.data && typeof error.response.data === 'object' && 'code' in error.response.data) {
    return {
      code: error.response.data.code,
      message: error.response.data.message,
      status: error.response.status ?? 500,
    };
  }

  return {
    code: 'NETWORK_ERROR',
    message: error.message || '네트워크 오류가 발생했습니다.',
    status: error.response?.status ?? 0,
  };
}
