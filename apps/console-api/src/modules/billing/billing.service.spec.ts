import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingService } from './billing.service';
import { SubscriptionEntity } from './entities/subscription.entity';
import { PaymentPort } from './ports/payment.port';
import { CreateSubscriptionRequestDto } from './dto/create-subscription.request.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
  InvalidStateTransitionException,
} from '../../common/exceptions/business.exception';

describe('BillingService', () => {
  let service: BillingService;
  let subscriptionRepo: jest.Mocked<Repository<SubscriptionEntity>>;
  let paymentPort: jest.Mocked<PaymentPort>;

  const tenantId = 'tenant-uuid-1';

  /** TRIAL 상태의 구독 엔티티를 생성한다. */
  function createTrialSubscription(): SubscriptionEntity {
    const entity = new SubscriptionEntity();
    entity.id = 'sub-uuid-1';
    entity.tenantId = tenantId;
    entity.status = 'TRIAL';
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
          provide: PaymentPort,
          useValue: {
            createCustomer: jest.fn(),
            createSubscription: jest.fn(),
            cancelSubscription: jest.fn(),
            getSubscription: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    subscriptionRepo = module.get(getRepositoryToken(SubscriptionEntity));
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
