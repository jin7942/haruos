/**
 * OTP 발송 포트.
 * 외부 이메일 서비스(SES, SendGrid 등)를 추상화한다.
 * 개발 환경에서는 ConsoleOtpAdapter, 프로덕션에서는 실제 메일 어댑터로 교체.
 */
export abstract class OtpSenderPort {
  /**
   * OTP 코드를 이메일로 발송한다.
   *
   * @param email - 수신자 이메일 주소
   * @param code - 6자리 OTP 코드
   */
  abstract sendOtp(email: string, code: string): Promise<void>;
}
