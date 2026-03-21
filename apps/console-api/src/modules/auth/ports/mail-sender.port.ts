/**
 * 이메일 발송 포트.
 * 외부 연동(SES, SendGrid 등)을 추상화.
 */
export abstract class MailSenderPort {
  abstract sendVerificationEmail(email: string, token: string): Promise<void>;
}
