import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Schedule } from '../entities/schedule.entity';

/** 일정 응답 DTO. */
export class ScheduleResponseDto {
  @ApiProperty({ description: '일정 ID' })
  id: string;

  @ApiProperty({ description: '일정 제목' })
  title: string;

  @ApiPropertyOptional({ description: '일정 설명' })
  description: string | null;

  @ApiProperty({ description: '시작일시' })
  startAt: string;

  @ApiPropertyOptional({ description: '종료일시' })
  endAt: string | null;

  @ApiProperty({ description: '종일 일정 여부' })
  isAllDay: boolean;

  @ApiPropertyOptional({ description: '장소' })
  location: string | null;

  @ApiProperty({ description: '상태', enum: ['SCHEDULED', 'CONFIRMED', 'CANCELLED'] })
  status: string;

  @ApiPropertyOptional({ description: 'ClickUp 태스크 ID' })
  clickupTaskId: string | null;

  @ApiProperty({ description: '생성자 ID' })
  createdBy: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: string;

  /**
   * Schedule 엔티티에서 DTO로 변환한다.
   *
   * @param entity - Schedule 엔티티
   */
  static from(entity: Schedule): ScheduleResponseDto {
    const dto = new ScheduleResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.startAt = entity.startAt.toISOString();
    dto.endAt = entity.endAt?.toISOString() ?? null;
    dto.isAllDay = entity.isAllDay;
    dto.location = entity.location;
    dto.status = entity.status;
    dto.clickupTaskId = entity.clickupTaskId;
    dto.createdBy = entity.createdBy;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
