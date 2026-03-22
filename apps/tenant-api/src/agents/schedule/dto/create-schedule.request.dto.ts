import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 일정 생성 요청 DTO. */
export class CreateScheduleRequestDto {
  @ApiProperty({ description: '일정 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '일정 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '시작일시 (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: '종료일시 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '연동할 ClickUp 태스크 ID' })
  @IsOptional()
  @IsString()
  clickupTaskId?: string;
}
