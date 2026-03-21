import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordRequestDto {
  @ApiProperty({ description: '현재 비밀번호' })
  @IsString()
  @MinLength(8)
  oldPassword: string;

  @ApiProperty({ description: '새 비밀번호 (8자 이상)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
