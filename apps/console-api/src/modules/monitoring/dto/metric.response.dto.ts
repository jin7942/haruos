import { ApiProperty } from '@nestjs/swagger';
import { MetricEntity } from '../entities/metric.entity';

/**
 * 메트릭 응답 DTO.
 */
export class MetricResponseDto {
  @ApiProperty({ description: '메트릭 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: '메트릭 유형 (ECS_CPU, RDS_CPU, S3_SIZE 등)' })
  metricType: string;

  @ApiProperty({ description: '메트릭 값' })
  value: number;

  @ApiProperty({ description: '단위 (Percent, Bytes, Count)' })
  unit: string;

  @ApiProperty({ description: '수집 시각' })
  collectedAt: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   */
  static from(entity: MetricEntity): MetricResponseDto {
    const dto = new MetricResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.metricType = entity.metricType;
    dto.value = Number(entity.value);
    dto.unit = entity.unit;
    dto.collectedAt = entity.collectedAt;
    return dto;
  }
}
