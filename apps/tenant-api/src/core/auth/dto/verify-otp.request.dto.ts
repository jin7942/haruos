import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** OTP 검증 요청 DTO. */
export class VerifyOtpRequestDto {
  @ApiProperty({ description: '이메일 주소', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '6자리 OTP 코드', example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}
