import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

@Entity('provisioning_jobs')
export class ProvisioningJobEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'current_step', default: 0 })
  currentStep: number;

  @Column({ name: 'total_steps' })
  totalSteps: number;

  @Column({ name: 'completed_steps', default: 0 })
  completedSteps: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'error_message', nullable: true })
  errorMessage: string | null;

  /** 작업 시작 */
  start(): void {
    if (this.status !== 'PENDING') {
      throw new InvalidStateTransitionException(this.status, 'IN_PROGRESS');
    }
    this.status = 'IN_PROGRESS';
    this.startedAt = new Date();
  }

  /** 작업 완료 */
  complete(): void {
    if (this.status !== 'IN_PROGRESS') {
      throw new InvalidStateTransitionException(this.status, 'COMPLETED');
    }
    this.status = 'COMPLETED';
    this.completedAt = new Date();
  }

  /** 작업 실패 */
  fail(errorMessage: string): void {
    if (this.status !== 'IN_PROGRESS') {
      throw new InvalidStateTransitionException(this.status, 'FAILED');
    }
    this.status = 'FAILED';
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
  }

  /** 작업 롤백 */
  rollback(): void {
    if (this.status !== 'FAILED') {
      throw new InvalidStateTransitionException(this.status, 'ROLLING_BACK');
    }
    this.status = 'ROLLING_BACK';
  }
}
