import { ApiProperty } from '@nestjs/swagger';
import { AiUsageRecordEntity } from '../entities/ai-usage-record.entity';

/**
 * AI 사용량 응답 DTO.
 */
export class AiUsageResponseDto {
  @ApiProperty({ description: 'AI 사용량 기록 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: 'Bedrock 모델 ID' })
  modelId: string;

  @ApiProperty({ description: '입력 토큰 수' })
  inputTokens: number;

  @ApiProperty({ description: '출력 토큰 수' })
  outputTokens: number;

  @ApiProperty({ description: '예상 비용 (USD)' })
  estimatedCost: number;

  @ApiProperty({ description: '수집 시각' })
  collectedAt: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   */
  static from(entity: AiUsageRecordEntity): AiUsageResponseDto {
    const dto = new AiUsageResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.modelId = entity.modelId;
    dto.inputTokens = entity.inputTokens;
    dto.outputTokens = entity.outputTokens;
    dto.estimatedCost = Number(entity.estimatedCost);
    dto.collectedAt = entity.collectedAt;
    return dto;
  }
}
