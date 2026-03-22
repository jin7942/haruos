import { Injectable, Logger } from '@nestjs/common';
import { OtpSenderPort } from '../ports/otp-sender.port';

/**
 * 개발용 OTP 어댑터.
 * 실제 메일 발송 대신 콘솔 로그로 OTP 코드 출력.
 */
@Injectable()
export class ConsoleOtpAdapter extends OtpSenderPort {
  private readonly logger = new Logger(ConsoleOtpAdapter.name);

  async sendOtp(email: string, code: string): Promise<void> {
    this.logger.log(`[OTP 발송] to: ${email}, code: ${code}`);
  }
}
