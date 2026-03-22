import type { LoginResponse, SignupResponse, TokenResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 회원가입 요청 파라미터. */
export interface SignupParams {
  email: string;
  password: string;
  name: string;
}

/** 로그인 요청 파라미터. */
export interface LoginParams {
  email: string;
  password: string;
}

/** 비밀번호 변경 요청 파라미터. */
export interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  /** 회원가입. */
  signup: (params: SignupParams) =>
    apiClient.post<SignupResponse>('/auth/signup', params).then((r) => r.data),

  /** 로그인. */
  login: (params: LoginParams) =>
    apiClient.post<LoginResponse>('/auth/login', params).then((r) => r.data),

  /** 이메일 인증. */
  verifyEmail: (token: string) =>
    apiClient.post<void>('/auth/verify-email', { token }).then((r) => r.data),

  /** 토큰 갱신. */
  refresh: (refreshToken: string) =>
    apiClient.post<TokenResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),

  /** 비밀번호 변경. */
  changePassword: (params: ChangePasswordParams) =>
    apiClient.post<void>('/auth/change-password', params).then((r) => r.data),
};
