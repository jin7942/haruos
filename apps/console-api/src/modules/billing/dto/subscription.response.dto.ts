import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionEntity, SubscriptionStatus } from '../entities/subscription.entity';

/** 구독 응답 DTO. */
export class SubscriptionResponseDto {
  @ApiProperty({ description: '구독 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: '요금제 타입' })
  planType: string;

  @ApiProperty({ description: '구독 상태', enum: ['ACTIVE', 'CANCELLED', 'PAST_DUE', 'EXPIRED'] })
  status: SubscriptionStatus;

  @ApiProperty({ description: '현재 결제 주기 종료일', nullable: true })
  currentPeriodEnd: Date | null;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  /**
   * SubscriptionEntity에서 응답 DTO로 변환한다.
   *
   * @param entity - 구독 엔티티
   * @returns 구독 응답 DTO
   */
  static from(entity: SubscriptionEntity): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.planType = entity.planType;
    dto.status = entity.status;
    dto.currentPeriodEnd = entity.currentPeriodEnd;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
