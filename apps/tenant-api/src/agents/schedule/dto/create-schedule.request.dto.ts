import { IsString, IsOptional, IsDateString, IsBoolean, IsInt } from 'class-validator';
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
  startAt: string;

  @ApiPropertyOptional({ description: '종료일시 (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ description: '종일 일정 여부', default: false })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({ description: '장소' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: '반복 규칙 (iCalendar RRULE)' })
  @IsOptional()
  @IsString()
  recurrenceRule?: string;

  @ApiPropertyOptional({ description: '알림 (분 단위, 시작 전)' })
  @IsOptional()
  @IsInt()
  reminderMinutes?: number;

  @ApiPropertyOptional({ description: '프로젝트 ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: '연동할 ClickUp 태스크 ID' })
  @IsOptional()
  @IsString()
  clickupTaskId?: string;
}
