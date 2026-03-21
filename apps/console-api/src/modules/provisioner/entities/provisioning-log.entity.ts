import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * 프로비저닝 단계별 로그 엔티티.
 * 각 프로비저닝 작업의 세부 단계 실행 결과를 기록한다.
 */
@Entity('provisioning_logs')
export class ProvisioningLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_id' })
  jobId: string;

  @Column({ name: 'step', length: 100 })
  step: string;

  @Column({ name: 'status', length: 50 })
  status: string;

  @Column({ name: 'message', type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'detail', type: 'jsonb', nullable: true })
  detail: Record<string, unknown> | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 단계 로그 생성 팩토리.
   *
   * @param jobId - 프로비저닝 작업 ID
   * @param step - 단계명 (예: 'VPC', 'RDS', 'ECS')
   * @param status - 단계 상태 (예: 'STARTED', 'COMPLETED', 'FAILED')
   * @param message - 로그 메시지
   */
  static of(jobId: string, step: string, status: string, message?: string): ProvisioningLogEntity {
    const log = new ProvisioningLogEntity();
    log.jobId = jobId;
    log.step = step;
    log.status = status;
    log.message = message || null;
    log.detail = null;
    log.startedAt = status === 'STARTED' ? new Date() : null;
    log.completedAt = status === 'COMPLETED' || status === 'FAILED' ? new Date() : null;
    return log;
  }
}
