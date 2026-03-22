import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BatchJob } from '../entities/batch-job.entity';

/** 배치 작업 응답 DTO. */
export class BatchJobResponseDto {
  @ApiProperty({ description: '작업 ID' })
  id: string;

  @ApiProperty({ description: '작업 이름' })
  name: string;

  @ApiProperty({ description: 'Cron 표현식' })
  cronExpression: string;

  @ApiProperty({ description: '작업 상태 (ACTIVE/PAUSED/COMPLETED)' })
  status: string;

  @ApiPropertyOptional({ description: '마지막 실행 시각' })
  lastRunAt: string | null;

  @ApiPropertyOptional({ description: '다음 실행 시각' })
  nextRunAt: string | null;

  @ApiPropertyOptional({ description: '작업 페이로드' })
  payload: Record<string, unknown> | null;

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
    dto.cronExpression = entity.cronExpression;
    dto.status = entity.status;
    dto.lastRunAt = entity.lastRunAt?.toISOString() ?? null;
    dto.nextRunAt = entity.nextRunAt?.toISOString() ?? null;
    dto.payload = entity.payload;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
