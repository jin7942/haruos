import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

@Entity('tenants')
export class TenantEntity extends SoftDeletableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'slug', unique: true })
  slug: string;

  @Column({ name: 'description', nullable: true })
  description: string | null;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'plan' })
  plan: string;

  @Column({ name: 'region' })
  region: string;

  @Column({ name: 'trial_ends_at', type: 'timestamptz', nullable: true })
  trialEndsAt: Date | null;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  /** 테넌트 활성화 */
  activate(): void {
    if (this.status === 'ACTIVE') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
    this.suspendedAt = null;
  }

  /** 테넌트 일시중지 */
  suspend(): void {
    if (this.status !== 'ACTIVE') {
      throw new InvalidStateTransitionException(this.status, 'SUSPENDED');
    }
    this.status = 'SUSPENDED';
    this.suspendedAt = new Date();
  }

  /** 테넌트 재개 */
  resume(): void {
    if (this.status !== 'SUSPENDED') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
    this.suspendedAt = null;
  }
}
