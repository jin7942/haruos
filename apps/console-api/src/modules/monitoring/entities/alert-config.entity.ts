import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 알림 설정 엔티티.
 * 테넌트별 메트릭/비용 임계값 알림을 관리한다.
 */
@Entity('alert_configs')
@Index(['tenantId', 'alertType'], { unique: true })
export class AlertConfigEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'alert_type', type: 'varchar', length: 50 })
  alertType: string;

  @Column({ name: 'threshold', type: 'decimal', precision: 20, scale: 4 })
  threshold: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'last_triggered_at', type: 'timestamptz', nullable: true })
  lastTriggeredAt: Date | null;
}
