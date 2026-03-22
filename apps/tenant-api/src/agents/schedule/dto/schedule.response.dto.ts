import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Schedule } from '../entities/schedule.entity';

/** 일정 응답 DTO. */
export class ScheduleResponseDto {
  @ApiProperty({ description: '일정 ID' })
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '일정 제목' })
  title: string;

  @ApiPropertyOptional({ description: '일정 설명' })
  description: string | null;

  @ApiProperty({ description: '시작일시' })
  startDate: Date;

  @ApiPropertyOptional({ description: '종료일시' })
  endDate: Date | null;

  @ApiPropertyOptional({ description: 'ClickUp 태스크 ID' })
  clickupTaskId: string | null;

  @ApiProperty({ description: '상태', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'] })
  status: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;

  /**
   * Schedule 엔티티에서 DTO로 변환한다.
   *
   * @param entity - Schedule 엔티티
   * @returns ScheduleResponseDto
   */
  static from(entity: Schedule): ScheduleResponseDto {
    const dto = new ScheduleResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.clickupTaskId = entity.clickupTaskId;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
