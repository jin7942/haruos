/** 사용자 요약 정보. 여러 응답에서 재사용. */
export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

/** 회원가입 응답. */
export interface SignupResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/** 로그인 응답. Access Token + Refresh Token + 사용자 요약. */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
}

/** 토큰 갱신 응답. */
export interface TokenResponse {
  accessToken: string;
}

/** 테넌트 사용자 요약 정보. */
export interface TenantUserSummary {
  id: string;
  email: string;
  name: string;
  tenantId: string;
}

/** OTP 발송 응답. */
export interface OtpResponse {
  expiresAt: string;
}

/** 테넌트 로그인 응답. */
export interface TenantLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: TenantUserSummary;
}
