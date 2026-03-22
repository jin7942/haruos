import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/** 일정 상태 */
export const ScheduleStatus = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * 일정 엔티티.
 * 사용자의 일정을 관리하며, ClickUp 태스크와 선택적으로 연동된다.
 *
 * 상태 전이:
 * - SCHEDULED -> CONFIRMED
 * - SCHEDULED -> CANCELLED
 * - CONFIRMED -> CANCELLED
 */
@Entity('schedules')
@Index(['startAt', 'endAt'])
export class Schedule extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @Column({ name: 'is_all_day', default: false })
  isAllDay: boolean;

  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string | null;

  @Column({ name: 'status', length: 50, default: 'SCHEDULED' })
  status: string;

  @Column({ name: 'recurrence_rule', type: 'varchar', length: 200, nullable: true })
  recurrenceRule: string | null;

  @Column({ name: 'reminder_minutes', type: 'int', nullable: true })
  reminderMinutes: number | null;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 'clickup_task_id', type: 'varchar', length: 50, nullable: true })
  clickupTaskId: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  /**
   * 일정을 확정한다.
   *
   * @throws InvalidStateTransitionException SCHEDULED가 아닌 상태에서 확정 시도 시
   */
  confirm(): void {
    if (this.status !== ScheduleStatus.SCHEDULED) {
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
