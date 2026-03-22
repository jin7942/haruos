import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/** 배치 작업 상태. */
export type BatchJobStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

/** 허용되는 상태 전이 맵. */
const ALLOWED_TRANSITIONS: Record<BatchJobStatus, BatchJobStatus[]> = {
  ACTIVE: ['PAUSED', 'COMPLETED'],
  PAUSED: ['ACTIVE'],
  COMPLETED: [],
};

/**
 * 배치 작업 엔티티.
 * 반복 실행할 예약 작업을 관리한다.
 */
@Entity('batch_jobs')
export class BatchJob extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'cron_expression', length: 50 })
  cronExpression: string;

  @Column({ name: 'is_enabled', default: true })
  isEnabled: boolean;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  @Column({ name: 'last_run_status', type: 'varchar', length: 50, nullable: true })
  lastRunStatus: string | null;

  @Column({ name: 'last_run_duration_ms', type: 'int', nullable: true })
  lastRunDurationMs: number | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  /** 작업 비활성화. */
  disable(): void {
    this.isEnabled = false;
  }

  /** 작업 활성화. */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * 실행 결과를 기록한다.
   *
   * @param status - 실행 결과 상태
   * @param durationMs - 실행 소요 시간 (ms)
   * @param error - 실패 시 에러 메시지
   */
  recordExecution(status: string, durationMs: number, error?: string): void {
    this.lastRunAt = new Date();
    this.lastRunStatus = status;
    this.lastRunDurationMs = durationMs;
    this.lastError = error || null;
  }
}
