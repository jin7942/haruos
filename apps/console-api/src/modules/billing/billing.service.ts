import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity } from './entities/subscription.entity';
import { PaymentPort } from './ports/payment.port';
import { CreateSubscriptionRequestDto } from './dto/create-subscription.request.dto';
import { SubscriptionResponseDto } from './dto/subscription.response.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../../common/exceptions/business.exception';

/**
 * 구독 결제 서비스.
 * PaymentPort를 통해 외부 결제 시스템과 연동하여 구독 생성/조회/취소를 처리한다.
 */
@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    private readonly paymentPort: PaymentPort,
  ) {}

  /**
   * 구독을 생성한다 (TRIAL 상태).
   * 외부 결제 시스템에 고객을 생성하고 DB에 저장.
   *
   * @param dto - 구독 생성 요청 (tenantId, email, name)
   * @returns 생성된 구독 정보
   * @throws DuplicateResourceException 해당 테넌트에 이미 구독이 있는 경우
   */
  async createSubscription(dto: CreateSubscriptionRequestDto): Promise<SubscriptionResponseDto> {
    const existing = await this.subscriptionRepository.findOne({
      where: { tenantId: dto.tenantId },
    });
    if (existing) {
      throw new DuplicateResourceException('Subscription', dto.tenantId);
    }

    const customerId = await this.paymentPort.createCustomer(dto.email, dto.name);

    const subscription = this.subscriptionRepository.create({
      tenantId: dto.tenantId,
      status: 'TRIAL',
      stripeCustomerId: customerId,
    });
    await this.subscriptionRepository.save(subscription);

    return SubscriptionResponseDto.from(subscription);
  }

  /**
   * 구독을 활성화한다 (결제 등록 완료 후).
   *
   * @param tenantId - 테넌트 ID
   * @param priceId - Stripe Price ID
   * @returns 활성화된 구독 정보
   * @throws ResourceNotFoundException 구독이 없는 경우
   */
  async activateSubscription(tenantId: string, priceId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
    });
    if (!subscription) {
      throw new ResourceNotFoundException('Subscription', tenantId);
    }

    const externalSubscriptionId = await this.paymentPort.createSubscription(
      subscription.stripeCustomerId!,
      priceId,
    );

    subscription.stripeSubscriptionId = externalSubscriptionId;
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    subscription.activate();

    await this.subscriptionRepository.save(subscription);
    return SubscriptionResponseDto.from(subscription);
  }

  /**
   * 테넌트의 구독을 조회한다.
   *
   * @param tenantId - 테넌트 ID
   * @returns 구독 정보
   * @throws ResourceNotFoundException 구독이 없는 경우
   */
  async getSubscription(tenantId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
    });
    if (!subscription) {
      throw new ResourceNotFoundException('Subscription', tenantId);
    }

    return SubscriptionResponseDto.from(subscription);
  }

  /**
   * 구독을 취소한다.
   * 외부 결제 시스템의 구독도 함께 취소.
   *
   * @param tenantId - 테넌트 ID
   * @returns 취소된 구독 정보
   * @throws ResourceNotFoundException 활성 구독이 없는 경우
   */
  async cancelSubscription(tenantId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
    });
    if (!subscription) {
      throw new ResourceNotFoundException('Subscription', tenantId);
    }

    if (subscription.stripeSubscriptionId) {
      await this.paymentPort.cancelSubscription(subscription.stripeSubscriptionId);
    }

    subscription.cancel();
    await this.subscriptionRepository.save(subscription);

    return SubscriptionResponseDto.from(subscription);
  }
}
