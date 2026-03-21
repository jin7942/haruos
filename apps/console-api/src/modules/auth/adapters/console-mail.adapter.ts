import { Injectable, Logger } from '@nestjs/common';
import { MailSenderPort } from '../ports/mail-sender.port';

/**
 * 개발용 이메일 어댑터.
 * 실제 메일 발송 대신 콘솔 로그로 토큰 출력.
 */
@Injectable()
export class ConsoleMailAdapter extends MailSenderPort {
  private readonly logger = new Logger(ConsoleMailAdapter.name);

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.logger.log(`[이메일 인증] to: ${email}, token: ${token}`);
  }
}
