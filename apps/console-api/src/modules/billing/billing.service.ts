import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionEntity } from './entities/subscription.entity';
import { TenantEntity } from '../tenant/entities/tenant.entity';
import { PaymentPort, WebhookEvent, InvoiceItem } from './ports/payment.port';
import { CreateSubscriptionRequestDto } from './dto/create-subscription.request.dto';
import { CreateCheckoutRequestDto } from './dto/create-checkout.request.dto';
import { CreatePortalRequestDto } from './dto/create-portal.request.dto';
import { SubscriptionResponseDto } from './dto/subscription.response.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
  UnauthorizedException,
} from '../../common/exceptions/business.exception';

/**
 * 구독 결제 서비스.
 * PaymentPort를 통해 Stripe와 연동하여 구독 라이프사이클을 관리한다.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
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
      planType: 'MONTHLY',
      stripeCustomerId: customerId,
    });
    await this.subscriptionRepository.save(subscription);

    return SubscriptionResponseDto.from(subscription);
  }

  /**
   * Stripe Checkout 세션을 생성한다.
   * 프론트엔드에서 이 URL로 리다이렉트하여 결제를 진행한다.
   *
   * @param dto - 체크아웃 요청 (tenantId, priceId, successUrl, cancelUrl)
   * @returns Checkout 세션 URL
   * @throws ResourceNotFoundException 구독이 없는 경우
   */
  async createCheckoutSession(dto: CreateCheckoutRequestDto): Promise<{ checkoutUrl: string }> {
    const subscription = await this.findSubscriptionOrThrow(dto.tenantId);

    const checkoutUrl = await this.paymentPort.createCheckoutSession(
      subscription.stripeCustomerId!,
      dto.priceId,
      dto.successUrl,
      dto.cancelUrl,
    );

    return { checkoutUrl };
  }

  /**
   * Stripe Customer Portal 세션을 생성한다.
   * 결제수단 변경, 인보이스 확인 등을 위한 포털.
   *
   * @param dto - 포털 요청 (tenantId, returnUrl)
   * @returns 포털 URL
   * @throws ResourceNotFoundException 구독이 없는 경우
   */
  async createPortalSession(dto: CreatePortalRequestDto): Promise<{ portalUrl: string }> {
    const subscription = await this.findSubscriptionOrThrow(dto.tenantId);

    const portalUrl = await this.paymentPort.createPortalSession(
      subscription.stripeCustomerId!,
      dto.returnUrl,
    );

    return { portalUrl };
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
    const subscription = await this.findSubscriptionOrThrow(tenantId);

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
    const subscription = await this.findSubscriptionOrThrow(tenantId);
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
    const subscription = await this.findSubscriptionOrThrow(tenantId);

    if (subscription.stripeSubscriptionId) {
      await this.paymentPort.cancelSubscription(subscription.stripeSubscriptionId);
    }

    subscription.cancel();
    await this.subscriptionRepository.save(subscription);

    return SubscriptionResponseDto.from(subscription);
  }

  /**
   * 고객의 인보이스 목록을 조회한다.
   *
   * @param tenantId - 테넌트 ID
   * @param limit - 조회 개수 (기본 10)
   * @returns 인보이스 목록
   * @throws ResourceNotFoundException 구독이 없는 경우
   */
  async listInvoices(tenantId: string, limit = 10): Promise<InvoiceItem[]> {
    const subscription = await this.findSubscriptionOrThrow(tenantId);
    return this.paymentPort.listInvoices(subscription.stripeCustomerId!, limit);
  }

  /**
   * Stripe 웹훅 이벤트를 처리한다.
   *
   * @param payload - 원시 요청 body
   * @param signature - Stripe-Signature 헤더
   */
  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const event = await this.paymentPort.verifyWebhookEvent(payload, signature);

    switch (event.type) {
      case 'invoice.paid':
        await this.handleInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;
      default:
        this.logger.debug(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * 결제 성공 이벤트 처리.
   * PAST_DUE 상태이면 ACTIVE로 복구. 구독 기간 갱신.
   */
  private async handleInvoicePaid(event: WebhookEvent): Promise<void> {
    const { subscriptionId } = event.data;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!subscription) {
      this.logger.warn(`invoice.paid: subscription not found for ${subscriptionId}`);
      return;
    }

    if (subscription.status === 'PAST_DUE') {
      subscription.reactivate();
      this.logger.log(`Subscription ${subscriptionId} reactivated after payment`);
    }

    // Stripe에서 최신 기간 정보 동기화
    const stripeInfo = await this.paymentPort.getSubscription(subscriptionId);
    subscription.currentPeriodEnd = stripeInfo.currentPeriodEnd;

    await this.subscriptionRepository.save(subscription);
  }

  /**
   * 결제 실패 이벤트 처리.
   * ACTIVE 구독을 PAST_DUE로 전환.
   */
  private async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    const { subscriptionId } = event.data;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!subscription) {
      this.logger.warn(`invoice.payment_failed: subscription not found for ${subscriptionId}`);
      return;
    }

    if (subscription.status === 'ACTIVE') {
      subscription.markPastDue();
      await this.subscriptionRepository.save(subscription);
      this.logger.log(`Subscription ${subscriptionId} marked as PAST_DUE`);
    }
  }

  /**
   * 구독 업데이트 이벤트 처리.
   * Stripe 구독 상태/기간을 동기화.
   */
  private async handleSubscriptionUpdated(event: WebhookEvent): Promise<void> {
    const { subscriptionId, currentPeriodStart, currentPeriodEnd } = event.data;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!subscription) return;

    if (currentPeriodStart) subscription.currentPeriodStart = currentPeriodStart;
    if (currentPeriodEnd) subscription.currentPeriodEnd = currentPeriodEnd;

    await this.subscriptionRepository.save(subscription);
  }

  /**
   * 구독 삭제 이벤트 처리.
   * 구독을 CANCELLED 상태로 전환.
   */
  private async handleSubscriptionDeleted(event: WebhookEvent): Promise<void> {
    const { subscriptionId } = event.data;
    if (!subscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId: subscriptionId },
    });
    if (!subscription) return;

    if (subscription.status === 'ACTIVE' || subscription.status === 'PAST_DUE') {
      subscription.cancel();
      await this.subscriptionRepository.save(subscription);
      this.logger.log(`Subscription ${subscriptionId} cancelled via webhook`);
    }
  }

  /**
   * 테넌트의 구독을 찾거나 예외를 던진다.
   */
  private async findSubscriptionOrThrow(tenantId: string): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId },
    });
    if (!subscription) {
      throw new ResourceNotFoundException('Subscription', tenantId);
    }
    return subscription;
  }

  /**
   * 테넌트 소유권을 검증한다.
   *
   * @param userId - JWT에서 추출한 사용자 ID
   * @param tenantId - 테넌트 ID
   * @throws UnauthorizedException 소유자가 아닌 경우
   */
  async verifyTenantOwnership(userId: string, tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId, userId },
    });
    if (!tenant) {
      throw new UnauthorizedException('Not the owner of this tenant');
    }
  }
}
