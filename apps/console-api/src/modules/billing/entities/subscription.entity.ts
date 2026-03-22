import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/** 구독 상태 허용 값 */
export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * 구독 엔티티.
 * 테넌트당 1개의 활성 구독을 갖는다.
 * 상태 전이는 비즈니스 메서드로만 수행 (setter 금지).
 */
@Entity('subscriptions')
export class SubscriptionEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'plan_type', default: 'STANDARD' })
  planType: string;

  @Column({ name: 'status' })
  status: SubscriptionStatus;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string | null;

  @Column({ name: 'stripe_subscription_id', nullable: true })
  stripeSubscriptionId: string | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date | null;

  /**
   * 구독을 활성화한다.
   *
   * @throws InvalidStateTransitionException 이미 ACTIVE 상태인 경우
   */
  activate(): void {
    if (this.status === 'ACTIVE') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
  }

  /**
   * 구독을 취소한다.
   *
   * @throws InvalidStateTransitionException ACTIVE 상태가 아닌 경우
   */
  cancel(): void {
    if (this.status !== 'ACTIVE' && this.status !== 'PAST_DUE') {
      throw new InvalidStateTransitionException(this.status, 'CANCELLED');
    }
    this.status = 'CANCELLED';
  }

  /**
   * 결제 실패로 구독을 연체 상태로 전환한다.
   *
   * @throws InvalidStateTransitionException ACTIVE 상태가 아닌 경우
   */
  markPastDue(): void {
    if (this.status !== 'ACTIVE') {
      throw new InvalidStateTransitionException(this.status, 'PAST_DUE');
    }
    this.status = 'PAST_DUE';
  }

  /**
   * 구독을 만료시킨다.
   *
   * @throws InvalidStateTransitionException 전이 불가 상태인 경우
   */
  expire(): void {
    if (this.status !== 'ACTIVE' && this.status !== 'CANCELLED' && this.status !== 'PAST_DUE') {
      throw new InvalidStateTransitionException(this.status, 'EXPIRED');
    }
    this.status = 'EXPIRED';
  }
}
