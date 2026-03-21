import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/**
 * 프로비저닝 작업 엔티티.
 * 상태 전이: PENDING -> IN_PROGRESS -> COMPLETED | FAILED -> ROLLING_BACK -> ROLLED_BACK
 */
@Entity('provisioning_jobs')
export class ProvisioningJobEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'status', length: 50, default: 'PENDING' })
  status: string;

  @Column({ name: 'current_step', length: 100, nullable: true })
  currentStep: string | null;

  @Column({ name: 'total_steps', default: 0 })
  totalSteps: number;

  @Column({ name: 'completed_steps', default: 0 })
  completedSteps: number;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'terraform_state_key', length: 500, nullable: true })
  terraformStateKey: string | null;

  /**
   * 프로비저닝 작업 생성 팩토리.
   *
   * @param tenantId - 대상 테넌트 ID
   * @param totalSteps - 전체 단계 수
   */
  static create(tenantId: string, totalSteps: number): ProvisioningJobEntity {
    const job = new ProvisioningJobEntity();
    job.tenantId = tenantId;
    job.status = 'PENDING';
    job.totalSteps = totalSteps;
    job.completedSteps = 0;
    job.currentStep = null;
    job.startedAt = null;
    job.completedAt = null;
    job.errorMessage = null;
    job.terraformStateKey = null;
    return job;
  }

  /**
   * PENDING -> IN_PROGRESS 전이.
   *
   * @throws InvalidStateTransitionException PENDING 상태가 아닌 경우
   */
  start(): void {
    if (this.status !== 'PENDING') {
      throw new InvalidStateTransitionException(this.status, 'IN_PROGRESS');
    }
    this.status = 'IN_PROGRESS';
    this.startedAt = new Date();
  }

  /**
   * IN_PROGRESS -> COMPLETED 전이.
   *
   * @throws InvalidStateTransitionException IN_PROGRESS 상태가 아닌 경우
   */
  complete(): void {
    if (this.status !== 'IN_PROGRESS') {
      throw new InvalidStateTransitionException(this.status, 'COMPLETED');
    }
    this.status = 'COMPLETED';
    this.completedAt = new Date();
  }

  /**
   * IN_PROGRESS -> FAILED 전이.
   *
   * @param errorMessage - 실패 원인 메시지
   * @throws InvalidStateTransitionException IN_PROGRESS 상태가 아닌 경우
   */
  fail(errorMessage: string): void {
    if (this.status !== 'IN_PROGRESS') {
      throw new InvalidStateTransitionException(this.status, 'FAILED');
    }
    this.status = 'FAILED';
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
  }

  /**
   * FAILED -> ROLLING_BACK 전이.
   *
   * @throws InvalidStateTransitionException FAILED 상태가 아닌 경우
   */
  rollback(): void {
    if (this.status !== 'FAILED') {
      throw new InvalidStateTransitionException(this.status, 'ROLLING_BACK');
    }
    this.status = 'ROLLING_BACK';
  }

  /**
   * ROLLING_BACK -> ROLLED_BACK 전이.
   *
   * @throws InvalidStateTransitionException ROLLING_BACK 상태가 아닌 경우
   */
  completeRollback(): void {
    if (this.status !== 'ROLLING_BACK') {
      throw new InvalidStateTransitionException(this.status, 'ROLLED_BACK');
    }
    this.status = 'ROLLED_BACK';
    this.completedAt = new Date();
  }

  /**
   * 현재 진행 단계 업데이트.
   *
   * @param step - 단계명
   */
  advanceStep(step: string): void {
    this.currentStep = step;
    this.completedSteps += 1;
  }
}
