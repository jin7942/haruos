import type { OtpResponse, TenantLoginResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/**
 * OTP 발송을 요청한다.
 *
 * @param email - 이메일 주소
 * @returns OTP 만료 시각
 */
export function requestOtp(email: string): Promise<OtpResponse> {
  return apiClient.post('/auth/otp/request', { email }).then((r) => r.data);
}

/**
 * OTP를 검증하고 로그인한다.
 *
 * @param email - 이메일 주소
 * @param code - 6자리 OTP 코드
 * @returns 로그인 응답 (토큰 + 사용자 정보)
 */
export function verifyOtp(email: string, code: string): Promise<TenantLoginResponse> {
  return apiClient.post('/auth/otp/verify', { email, code }).then((r) => r.data);
}

/** 로그아웃한다. */
export function logout(): Promise<void> {
  return apiClient.post('/auth/logout').then(() => undefined);
}
