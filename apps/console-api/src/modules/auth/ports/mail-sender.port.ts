/**
 * 이메일 발송 포트.
 * 외부 연동(SES, SendGrid 등)을 추상화한다.
 * 개발 환경에서는 ConsoleMailAdapter, 프로덕션에서는 SES/SendGrid 어댑터로 교체.
 */
export abstract class MailSenderPort {
  /**
   * 이메일 인증 메일을 발송한다.
   *
   * @param email - 수신자 이메일 주소
   * @param token - 인증 토큰 (24시간 유효)
   */
  abstract sendVerificationEmail(email: string, token: string): Promise<void>;
}
