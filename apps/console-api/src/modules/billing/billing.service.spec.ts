import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingService } from './billing.service';
import { SubscriptionEntity } from './entities/subscription.entity';
import { TenantEntity } from '../tenant/entities/tenant.entity';
import { PaymentPort } from './ports/payment.port';
import { CreateSubscriptionRequestDto } from './dto/create-subscription.request.dto';
import { CreateCheckoutRequestDto } from './dto/create-checkout.request.dto';
import { CreatePortalRequestDto } from './dto/create-portal.request.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
  InvalidStateTransitionException,
  UnauthorizedException,
} from '../../common/exceptions/business.exception';

describe('BillingService', () => {
  let service: BillingService;
  let subscriptionRepo: jest.Mocked<Repository<SubscriptionEntity>>;
  let tenantRepo: jest.Mocked<Repository<TenantEntity>>;
  let paymentPort: jest.Mocked<PaymentPort>;

  const tenantId = 'tenant-uuid-1';
  const userId = 'user-uuid-1';

  /** TRIAL 상태의 구독 엔티티를 생성한다. */
  function createTrialSubscription(): SubscriptionEntity {
    const entity = new SubscriptionEntity();
    entity.id = 'sub-uuid-1';
    entity.tenantId = tenantId;
    entity.status = 'TRIAL';
    entity.planType = 'MONTHLY';
    entity.stripeCustomerId = 'cus_123';
    entity.stripeSubscriptionId = null;
    entity.currentPeriodStart = null;
    entity.currentPeriodEnd = null;
    entity.cancelledAt = null;
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    return entity;
  }

  /** ACTIVE 상태의 구독 엔티티를 생성한다. */
  function createActiveSubscription(): SubscriptionEntity {
    const entity = createTrialSubscription();
    entity.status = 'ACTIVE';
    entity.stripeSubscriptionId = 'sub_123';
    entity.currentPeriodStart = new Date();
    entity.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return entity;
  }

  /** 구독 생성 요청 DTO를 생성한다. */
  function createDto(): CreateSubscriptionRequestDto {
    const dto = new CreateSubscriptionRequestDto();
    dto.tenantId = tenantId;
    dto.email = 'test@example.com';
    dto.name = 'Test User';
    return dto;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: getRepositoryToken(SubscriptionEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: PaymentPort,
          useValue: {
            createCustomer: jest.fn(),
            createSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
            getSubscription: jest.fn(),
            createCheckoutSession: jest.fn(),
            createPortalSession: jest.fn(),
            verifyWebhookEvent: jest.fn(),
            listInvoices: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    subscriptionRepo = module.get(getRepositoryToken(SubscriptionEntity));
    tenantRepo = module.get(getRepositoryToken(TenantEntity));
    paymentPort = module.get(PaymentPort) as jest.Mocked<PaymentPort>;
  });

  describe('createSubscription', () => {
    it('TRIAL 상태로 구독을 생성한다', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);
      paymentPort.createCustomer.mockResolvedValue('cus_new');

      const entity = createTrialSubscription();
      entity.stripeCustomerId = 'cus_new';
      subscriptionRepo.create.mockReturnValue(entity);
      subscriptionRepo.save.mockResolvedValue(entity);

      const result = await service.createSubscription(createDto());

      expect(result.tenantId).toBe(tenantId);
      expect(result.status).toBe('TRIAL');
      expect(result.planType).toBe('MONTHLY');
      expect(paymentPort.createCustomer).toHaveBeenCalledWith('test@example.com', 'Test User');
    });

    it('이미 구독이 있으면 DuplicateResourceException을 던진다', async () => {
      subscriptionRepo.findOne.mockResolvedValue(createTrialSubscription());

      await expect(service.createSubscription(createDto())).rejects.toThrow(
        DuplicateResourceException,
      );
    });
  });

  describe('getSubscription', () => {
    it('구독 정보를 조회한다', async () => {
      const entity = createActiveSubscription();
      subscriptionRepo.findOne.mockResolvedValue(entity);

      const result = await service.getSubscription(tenantId);

      expect(result.id).toBe('sub-uuid-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('구독이 없으면 ResourceNotFoundException을 던진다', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.getSubscription(tenantId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('cancelSubscription', () => {
    it('구독을 정상 취소한다', async () => {
      const entity = createActiveSubscription();
      subscriptionRepo.findOne.mockResolvedValue(entity);
      subscriptionRepo.save.mockImplementation(async (e) => e as SubscriptionEntity);

      const result = await service.cancelSubscription(tenantId);

      expect(result.status).toBe('CANCELLED');
      expect(paymentPort.cancelSubscription).toHaveBeenCalledWith('sub_123');
    });

    it('구독이 없으면 ResourceNotFoundException을 던진다', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelSubscription(tenantId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('stripeSubscriptionId가 없으면 외부 취소를 건너뛴다', async () => {
      const entity = createActiveSubscription();
      entity.stripeSubscriptionId = null;
      subscriptionRepo.findOne.mockResolvedValue(entity);
      subscriptionRepo.save.mockImplementation(async (e) => e as SubscriptionEntity);

      await service.cancelSubscription(tenantId);

      expect(paymentPort.cancelSubscription).not.toHaveBeenCalled();
    });
  });

  describe('createCheckoutSession', () => {
    it('Stripe Checkout URL을 반환한다', async () => {
      const entity = createTrialSubscription();
      subscriptionRepo.findOne.mockResolvedValue(entity);
      paymentPort.createCheckoutSession.mockResolvedValue('https://checkout.stripe.com/session123');

      const dto = new CreateCheckoutRequestDto();
      dto.tenantId = tenantId;
      dto.priceId = 'price_monthly';
      dto.successUrl = 'https://app.haruos.com/success';
      dto.cancelUrl = 'https://app.haruos.com/cancel';

      const result = await service.createCheckoutSession(dto);

      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/session123');
      expect(paymentPort.createCheckoutSession).toHaveBeenCalledWith(
        'cus_123',
        'price_monthly',
        'https://app.haruos.com/success',
        'https://app.haruos.com/cancel',
      );
    });

    it('구독이 없으면 ResourceNotFoundException을 던진다', async () => {
      subscriptionRepo.findOne.mockResolvedValue(null);

      const dto = new CreateCheckoutRequestDto();
      dto.tenantId = tenantId;
      dto.priceId = 'price_monthly';
      dto.successUrl = 'https://app.haruos.com/success';
      dto.cancelUrl = 'https://app.haruos.com/cancel';

      await expect(service.createCheckoutSession(dto)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('createPortalSession', () => {
    it('Stripe Portal URL을 반환한다', async () => {
      const entity = createActiveSubscription();
      subscriptionRepo.findOne.mockResolvedValue(entity);
      paymentPort.createPortalSession.mockResolvedValue('https://billing.stripe.com/portal123');

      const dto = new CreatePortalRequestDto();
      dto.tenantId = tenantId;
      dto.returnUrl = 'https://app.haruos.com/settings';

      const result = await service.createPortalSession(dto);

      expect(result.portalUrl).toBe('https://billing.stripe.com/portal123');
      expect(paymentPort.createPortalSession).toHaveBeenCalledWith(
        'cus_123',
        'https://app.haruos.com/settings',
      );
    });
  });

  describe('listInvoices', () => {
    it('인보이스 목록을 반환한다', async () => {
      const entity = createActiveSubscription();
      subscriptionRepo.findOne.mockResolvedValue(entity);
      paymentPort.listInvoices.mockResolvedValue([
        {
          id: 'inv_1',
          amountPaid: 1900,
          currency: 'usd',
          status: 'paid',
          paidAt: '2026-03-01T00:00:00.000Z',
          invoiceUrl: 'https://stripe.com/invoice/1',
          periodStart: '2026-02-01T00:00:00.000Z',
          periodEnd: '2026-03-01T00:00:00.000Z',
        },
      ]);

      const result = await service.listInvoices(tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].amountPaid).toBe(1900);
      expect(paymentPort.listInvoices).toHaveBeenCalledWith('cus_123', 10);
    });
  });

  describe('handleWebhook', () => {
    const payload = Buffer.from('test');
    const signature = 'sig_test';

    it('invoice.paid: PAST_DUE 구독을 ACTIVE로 복구한다', async () => {
      const entity = createActiveSubscription();
      entity.status = 'PAST_DUE';
      entity.markPastDue = undefined as never; // 이미 PAST_DUE

      paymentPort.verifyWebhookEvent.mockResolvedValue({
        type: 'invoice.paid',
        data: { subscriptionId: 'sub_123' },
      });
      subscriptionRepo.findOne.mockResolvedValue(entity);
      paymentPort.getSubscription.mockResolvedValue({
        status: 'active',
        currentPeriodEnd: new Date('2026-04-01'),
      });
      subscriptionRepo.save.mockImplementation(async (e) => e as SubscriptionEntity);

      await service.handleWebhook(payload, signature);

      expect(entity.status).toBe('ACTIVE');
      expect(entity.currentPeriodEnd).toEqual(new Date('2026-04-01'));
      expect(subscriptionRepo.save).toHaveBeenCalled();
    });

    it('invoice.payment_failed: ACTIVE 구독을 PAST_DUE로 전환한다', async () => {
      const entity = createActiveSubscription();

      paymentPort.verifyWebhookEvent.mockResolvedValue({
        type: 'invoice.payment_failed',
        data: { subscriptionId: 'sub_123' },
      });
      subscriptionRepo.findOne.mockResolvedValue(entity);
      subscriptionRepo.save.mockImplementation(async (e) => e as SubscriptionEntity);

      await service.handleWebhook(payload, signature);

      expect(entity.status).toBe('PAST_DUE');
      expect(subscriptionRepo.save).toHaveBeenCalled();
    });

    it('customer.subscription.deleted: 구독을 CANCELLED로 전환한다', async () => {
      const entity = createActiveSubscription();

      paymentPort.verifyWebhookEvent.mockResolvedValue({
        type: 'customer.subscription.deleted',
        data: { subscriptionId: 'sub_123' },
      });
      subscriptionRepo.findOne.mockResolvedValue(entity);
      subscriptionRepo.save.mockImplementation(async (e) => e as SubscriptionEntity);

      await service.handleWebhook(payload, signature);

      expect(entity.status).toBe('CANCELLED');
    });

    it('customer.subscription.updated: 구독 기간을 업데이트한다', async () => {
      const entity = createActiveSubscription();
      const newStart = new Date('2026-04-01');
      const newEnd = new Date('2026-05-01');

      paymentPort.verifyWebhookEvent.mockResolvedValue({
        type: 'customer.subscription.updated',
        data: {
          subscriptionId: 'sub_123',
          currentPeriodStart: newStart,
          currentPeriodEnd: newEnd,
        },
      });
      subscriptionRepo.findOne.mockResolvedValue(entity);
      subscriptionRepo.save.mockImplementation(async (e) => e as SubscriptionEntity);

      await service.handleWebhook(payload, signature);

      expect(entity.currentPeriodStart).toEqual(newStart);
      expect(entity.currentPeriodEnd).toEqual(newEnd);
    });

    it('구독을 찾을 수 없으면 무시한다', async () => {
      paymentPort.verifyWebhookEvent.mockResolvedValue({
        type: 'invoice.paid',
        data: { subscriptionId: 'sub_unknown' },
      });
      subscriptionRepo.findOne.mockResolvedValue(null);

      await service.handleWebhook(payload, signature);

      expect(subscriptionRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('verifyTenantOwnership', () => {
    it('소유자가 맞으면 정상 통과한다', async () => {
      tenantRepo.findOne.mockResolvedValue({ id: tenantId, userId } as TenantEntity);

      await expect(service.verifyTenantOwnership(userId, tenantId)).resolves.toBeUndefined();
      expect(tenantRepo.findOne).toHaveBeenCalledWith({
        where: { id: tenantId, userId },
      });
    });

    it('소유자가 아니면 UnauthorizedException을 던진다', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyTenantOwnership('other-user', tenantId)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('SubscriptionEntity 상태 전이', () => {
    it('TRIAL -> ACTIVE 정상 전이', () => {
      const entity = createTrialSubscription();
      entity.activate();
      expect(entity.status).toBe('ACTIVE');
    });

    it('ACTIVE -> CANCELLED 정상 전이', () => {
      const entity = createActiveSubscription();
      entity.cancel();
      expect(entity.status).toBe('CANCELLED');
    });

    it('ACTIVE -> PAST_DUE 정상 전이', () => {
      const entity = createActiveSubscription();
      entity.markPastDue();
      expect(entity.status).toBe('PAST_DUE');
    });

    it('PAST_DUE -> ACTIVE 정상 전이 (reactivate)', () => {
      const entity = createActiveSubscription();
      entity.markPastDue();
      entity.reactivate();
      expect(entity.status).toBe('ACTIVE');
    });

    it('PAST_DUE -> CANCELLED 정상 전이', () => {
      const entity = createActiveSubscription();
      entity.markPastDue();
      entity.cancel();
      expect(entity.status).toBe('CANCELLED');
    });

    it('CANCELLED에서 cancel() 호출 시 InvalidStateTransitionException', () => {
      const entity = createActiveSubscription();
      entity.cancel();
      expect(() => entity.cancel()).toThrow(InvalidStateTransitionException);
    });

    it('ACTIVE에서 activate() 호출 시 InvalidStateTransitionException', () => {
      const entity = createActiveSubscription();
      expect(() => entity.activate()).toThrow(InvalidStateTransitionException);
    });

    it('ACTIVE에서 reactivate() 호출 시 InvalidStateTransitionException', () => {
      const entity = createActiveSubscription();
      expect(() => entity.reactivate()).toThrow(InvalidStateTransitionException);
    });

    it('ACTIVE -> EXPIRED 정상 전이', () => {
      const entity = createActiveSubscription();
      entity.expire();
      expect(entity.status).toBe('EXPIRED');
    });

    it('EXPIRED에서 expire() 호출 시 InvalidStateTransitionException', () => {
      const entity = createActiveSubscription();
      entity.expire();
      expect(() => entity.expire()).toThrow(InvalidStateTransitionException);
    });
  });
});
