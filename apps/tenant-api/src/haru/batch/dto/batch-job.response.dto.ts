import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BatchJob } from '../entities/batch-job.entity';

/** 배치 작업 응답 DTO. */
export class BatchJobResponseDto {
  @ApiProperty({ description: '작업 ID' })
  id: string;

  @ApiProperty({ description: '작업 이름' })
  name: string;

  @ApiPropertyOptional({ description: '작업 설명' })
  description: string | null;

  @ApiProperty({ description: 'Cron 표현식' })
  cronExpression: string;

  @ApiProperty({ description: '활성화 여부' })
  isEnabled: boolean;

  @ApiPropertyOptional({ description: '마지막 실행 시각' })
  lastRunAt: string | null;

  @ApiPropertyOptional({ description: '마지막 실행 상태' })
  lastRunStatus: string | null;

  @ApiProperty({ description: '생성 시각' })
  createdAt: string;

  /**
   * BatchJob 엔티티에서 변환.
   *
   * @param entity - BatchJob 엔티티
   */
  static from(entity: BatchJob): BatchJobResponseDto {
    const dto = new BatchJobResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.cronExpression = entity.cronExpression;
    dto.isEnabled = entity.isEnabled;
    dto.lastRunAt = entity.lastRunAt?.toISOString() ?? null;
    dto.lastRunStatus = entity.lastRunStatus;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
