import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** 파일 정리 요청 DTO. */
export class OrganizeFilesRequestDto {
  @ApiPropertyOptional({ description: '특정 사용자 파일만 정리 (생략 시 전체)' })
  @IsOptional()
  @IsString()
  userId?: string;
}
