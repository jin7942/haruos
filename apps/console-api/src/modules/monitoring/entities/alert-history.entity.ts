import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 알림 발생 이력 엔티티.
 * 임계값 초과 시 발생한 알림 기록을 저장한다.
 */
@Entity('alert_histories')
@Index(['tenantId'])
export class AlertHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'alert_config_id', type: 'uuid' })
  alertConfigId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'triggered_value', type: 'decimal', precision: 20, scale: 4 })
  triggeredValue: number;

  @Column({ name: 'message', type: 'text' })
  message: string;

  @Column({ name: 'notified_at', type: 'timestamptz' })
  notifiedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
