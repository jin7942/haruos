import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** OTP 발송 요청 DTO. */
export class RequestOtpRequestDto {
  @ApiProperty({ description: '이메일 주소', example: 'user@example.com' })
  @IsEmail()
  email: string;
}
