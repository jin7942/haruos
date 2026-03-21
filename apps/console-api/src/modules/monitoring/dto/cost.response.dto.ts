import { ApiProperty } from '@nestjs/swagger';
import { CostRecordEntity } from '../entities/cost-record.entity';

/**
 * 비용 기록 응답 DTO.
 */
export class CostResponseDto {
  @ApiProperty({ description: '비용 기록 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: 'AWS 서비스명 (RDS, ECS, S3 등)' })
  service: string;

  @ApiProperty({ description: '비용' })
  cost: number;

  @ApiProperty({ description: '통화 (USD)' })
  currency: string;

  @ApiProperty({ description: '기간 시작일' })
  periodStart: Date;

  @ApiProperty({ description: '기간 종료일' })
  periodEnd: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   */
  static from(entity: CostRecordEntity): CostResponseDto {
    const dto = new CostResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.service = entity.service;
    dto.cost = Number(entity.cost);
    dto.currency = entity.currency;
    dto.periodStart = entity.periodStart;
    dto.periodEnd = entity.periodEnd;
    return dto;
  }
}
