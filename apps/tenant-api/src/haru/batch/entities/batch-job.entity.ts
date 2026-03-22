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

  @Column({ name: 'user_id' })
  userId: string;

  @Column()
  name: string;

  @Column({ name: 'cron_expression' })
  cronExpression: string;

  @Column({ default: 'ACTIVE' })
  status: BatchJobStatus;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  nextRunAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  /**
   * 상태 전이 실행.
   * 허용되지 않은 전이는 예외를 발생시킨다.
   *
   * @param target - 목표 상태
   * @throws InvalidStateTransitionException 허용되지 않은 전이인 경우
   */
  private transitionTo(target: BatchJobStatus): void {
    if (!ALLOWED_TRANSITIONS[this.status].includes(target)) {
      throw new InvalidStateTransitionException(this.status, target);
    }
    this.status = target;
  }

  /** 작업 일시정지. ACTIVE -> PAUSED */
  pause(): void {
    this.transitionTo('PAUSED');
  }

  /** 작업 재개. PAUSED -> ACTIVE */
  resume(): void {
    this.transitionTo('ACTIVE');
  }

  /** 작업 완료 처리. ACTIVE -> COMPLETED */
  complete(): void {
    this.transitionTo('COMPLETED');
  }

  /** 마지막 실행 시각 기록. */
  recordExecution(): void {
    this.lastRunAt = new Date();
  }
}
