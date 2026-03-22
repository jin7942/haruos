import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** 일정 수정 요청 DTO. */
export class UpdateScheduleRequestDto {
  @ApiPropertyOptional({ description: '일정 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '일정 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '시작일시 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional({ description: '종료일시 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({
    description: '상태 변경',
    enum: ['CONFIRMED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['CONFIRMED', 'CANCELLED'])
  status?: string;
}
