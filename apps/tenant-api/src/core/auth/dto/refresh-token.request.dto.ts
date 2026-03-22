import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 토큰 갱신 요청 DTO. */
export class RefreshTokenRequestDto {
  @ApiProperty({ description: 'Refresh Token' })
  @IsString()
  refreshToken: string;
}
