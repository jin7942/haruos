import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('schedules')
export class Schedule extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @Column({ name: 'is_all_day', default: false })
  isAllDay: boolean;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'reminder_minutes', type: 'int', nullable: true })
  reminderMinutes: number | null;

  @Column({ name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;
}
