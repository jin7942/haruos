import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailRequestDto {
  @ApiProperty({ description: '이메일 인증 토큰' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
