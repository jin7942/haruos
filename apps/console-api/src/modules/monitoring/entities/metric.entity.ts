import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('metrics')
export class MetricEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'metric_type' })
  metricType: string;

  @Column({ name: 'value', type: 'decimal' })
  value: number;

  @Column({ name: 'unit' })
  unit: string;

  @Column({ name: 'collected_at', type: 'timestamptz' })
  collectedAt: Date;
}
