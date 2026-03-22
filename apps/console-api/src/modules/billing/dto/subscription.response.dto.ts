import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionEntity, SubscriptionStatus } from '../entities/subscription.entity';

/** 구독 응답 DTO. */
export class SubscriptionResponseDto {
  @ApiProperty({ description: '구독 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: '요금제 타입', example: 'MONTHLY' })
  planType: string;

  @ApiProperty({ description: '구독 상태', enum: ['TRIAL', 'ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED'] })
  status: SubscriptionStatus;

  @ApiProperty({ description: 'Stripe Customer ID', nullable: true })
  stripeCustomerId: string | null;

  @ApiProperty({ description: '현재 결제 주기 종료일', nullable: true })
  currentPeriodEnd: string | null;

  @ApiProperty({ description: '취소일', nullable: true })
  cancelledAt: string | null;

  @ApiProperty({ description: '생성일' })
  createdAt: string;

  /**
   * SubscriptionEntity에서 응답 DTO로 변환한다.
   *
   * @param entity - 구독 엔티티
   */
  static from(entity: SubscriptionEntity): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.planType = entity.planType;
    dto.status = entity.status;
    dto.stripeCustomerId = entity.stripeCustomerId;
    dto.currentPeriodEnd = entity.currentPeriodEnd?.toISOString() ?? null;
    dto.cancelledAt = entity.cancelledAt?.toISOString() ?? null;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
