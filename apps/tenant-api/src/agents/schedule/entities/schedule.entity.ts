import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/** 일정 상태 */
export const ScheduleStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * 일정 엔티티.
 * 사용자의 일정을 관리하며, ClickUp 태스크와 선택적으로 연동된다.
 *
 * 상태 전이:
 * - PENDING -> CONFIRMED
 * - PENDING -> CANCELLED
 * - CONFIRMED -> CANCELLED
 */
@Entity('schedules')
export class Schedule extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'timestamptz' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: true })
  endDate: Date | null;

  @Column({ name: 'clickup_task_id', nullable: true })
  clickupTaskId: string | null;

  @Column({ name: 'status', default: ScheduleStatus.PENDING })
  status: string;

  /**
   * 일정을 확정한다.
   *
   * @throws InvalidStateTransitionException PENDING이 아닌 상태에서 확정 시도 시
   */
  confirm(): void {
    if (this.status !== ScheduleStatus.PENDING) {
      throw new InvalidStateTransitionException(this.status, ScheduleStatus.CONFIRMED);
    }
    this.status = ScheduleStatus.CONFIRMED;
  }

  /**
   * 일정을 취소한다.
   *
   * @throws InvalidStateTransitionException 이미 취소된 일정을 다시 취소 시도 시
   */
  cancel(): void {
    if (this.status === ScheduleStatus.CANCELLED) {
      throw new InvalidStateTransitionException(this.status, ScheduleStatus.CANCELLED);
    }
    this.status = ScheduleStatus.CANCELLED;
  }
}
