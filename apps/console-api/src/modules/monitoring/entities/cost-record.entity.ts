import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 비용 기록 엔티티.
 * AWS Cost Explorer에서 수집한 서비스별 비용을 저장한다.
 */
@Entity('cost_records')
@Index(['tenantId', 'periodStart'])
export class CostRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'service', type: 'varchar', length: 50 })
  service: string;

  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 4 })
  cost: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'period_start', type: 'date' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'date' })
  periodEnd: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
