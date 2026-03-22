import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** 프로젝트 동기화 요청 DTO. */
export class SyncProjectRequestDto {
  @ApiPropertyOptional({ description: '동기화 대상 ClickUp Space ID (미지정 시 전체 동기화)' })
  @IsOptional()
  @IsString()
  spaceId?: string;
}
