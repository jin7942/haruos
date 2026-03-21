import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 인프라 메트릭 엔티티.
 * CloudWatch에서 수집한 ECS/RDS/S3 메트릭을 저장한다.
 */
@Entity('metrics')
@Index(['tenantId', 'metricType', 'collectedAt'])
export class MetricEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'metric_type', type: 'varchar', length: 50 })
  metricType: string;

  @Column({ name: 'value', type: 'decimal', precision: 20, scale: 4 })
  value: number;

  @Column({ name: 'unit', type: 'varchar', length: 20, nullable: true })
  unit: string;

  @Column({ name: 'collected_at', type: 'timestamptz' })
  collectedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
