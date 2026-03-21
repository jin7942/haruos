import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupRequestDto {
  @ApiProperty({ description: '이메일 주소' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: '비밀번호 (8자 이상)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: '사용자 이름' })
  @IsString()
  @MinLength(2)
  name: string;
}
