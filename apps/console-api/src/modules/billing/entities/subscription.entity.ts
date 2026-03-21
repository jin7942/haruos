import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

@Entity('subscriptions')
export class SubscriptionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string | null;

  @Column({ name: 'stripe_subscription_id', nullable: true })
  stripeSubscriptionId: string | null;

  /** 구독 활성화 */
  activate(): void {
    if (this.status === 'ACTIVE') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
  }

  /** 구독 취소 */
  cancel(): void {
    if (this.status !== 'ACTIVE') {
      throw new InvalidStateTransitionException(this.status, 'CANCELLED');
    }
    this.status = 'CANCELLED';
  }

  /** 구독 만료 */
  expire(): void {
    if (this.status !== 'ACTIVE' && this.status !== 'CANCELLED') {
      throw new InvalidStateTransitionException(this.status, 'EXPIRED');
    }
    this.status = 'EXPIRED';
  }
}
