import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('alert_configs')
export class AlertConfigEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'alert_type' })
  alertType: string;

  @Column({ name: 'threshold', type: 'decimal' })
  threshold: number;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;
}
