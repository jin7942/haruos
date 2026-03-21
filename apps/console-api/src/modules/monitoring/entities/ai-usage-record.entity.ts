import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * AI 사용량 기록 엔티티.
 * Bedrock 모델 호출의 토큰 사용량과 예상 비용을 저장한다.
 */
@Entity('ai_usage_records')
@Index(['tenantId', 'collectedAt'])
export class AiUsageRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'model_id', type: 'varchar', length: 100 })
  modelId: string;

  @Column({ name: 'input_tokens', type: 'int', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'int', default: 0 })
  outputTokens: number;

  @Column({ name: 'estimated_cost', type: 'decimal', precision: 10, scale: 6, default: 0 })
  estimatedCost: number;

  @Column({ name: 'collected_at', type: 'timestamptz' })
  collectedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
