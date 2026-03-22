import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as dns from 'dns';
import { DomainService } from './domain.service';
import { DomainEntity } from './entities/domain.entity';
import { TenantService } from '../tenant/tenant.service';
import { TenantResponseDto } from '../tenant/dto/tenant.response.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
  InvalidStateTransitionException,
  ValidationException,
} from '../../common/exceptions/business.exception';
import { ExternalApiException } from '../../common/exceptions/technical.exception';

jest.mock('dns', () => ({
  promises: {
    resolveCname: jest.fn().mockResolvedValue(['target.haruos.app']),
  },
}));

describe('DomainService', () => {
  let service: DomainService;
  let domainRepo: jest.Mocked<Repository<DomainEntity>>;
  let tenantService: jest.Mocked<TenantService>;

  const userId = 'user-uuid-1';
  const tenantId = 'tenant-uuid-1';
  const domainId = 'domain-uuid-1';

  /** PENDING 상태의 커스텀 도메인 엔티티를 생성한다. */
  function createPendingDomain(): DomainEntity {
    const domain = DomainEntity.createCustom(tenantId, 'haru.company.com', 'CLOUDFLARE');
    domain.id = domainId;
    return domain;
  }

  /** ACTIVE 상태의 서브도메인 엔티티를 생성한다. */
  function createActiveSubdomain(): DomainEntity {
    const domain = DomainEntity.createSubdomain(tenantId, 'test-slug', 'haruos.app');
    domain.id = domainId;
    return domain;
  }

  /** VERIFIED 상태의 커스텀 도메인 엔티티를 생성한다. */
  function createVerifiedDomain(): DomainEntity {
    const domain = createPendingDomain();
    domain.verify();
    return domain;
  }

  /** ACTIVE 상태의 커스텀 도메인 엔티티를 생성한다. */
  function createActiveDomain(): DomainEntity {
    const domain = createVerifiedDomain();
    domain.activate();
    return domain;
  }

  /** 테넌트 응답 DTO 목 */
  const tenantResponse: TenantResponseDto = {
    id: tenantId,
    name: '테스트',
    slug: 'test-slug',
    description: null,
    status: 'ACTIVE',
    plan: 'STARTER',
    region: 'ap-northeast-2',
    trialEndsAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainService,
        {
          provide: getRepositoryToken(DomainEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: TenantService,
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DomainService>(DomainService);
    domainRepo = module.get(getRepositoryToken(DomainEntity));
    tenantService = module.get(TenantService) as jest.Mocked<TenantService>;
  });

  describe('createSubdomain', () => {
    it('서브도메인을 정상 생성한다', async () => {
      domainRepo.findOne.mockResolvedValue(null);
      domainRepo.save.mockImplementation(async (entity) => entity as DomainEntity);

      const result = await service.createSubdomain(tenantId, 'test-slug');

      expect(result.domain).toBe('test-slug.haruos.app');
      expect(result.type).toBe('SUBDOMAIN');
      expect(result.status).toBe('ACTIVE');
      expect(result.isPrimary).toBe(true);
      expect(domainRepo.save).toHaveBeenCalled();
    });

    it('도메인 중복 시 DuplicateResourceException을 던진다', async () => {
      domainRepo.findOne.mockResolvedValue(createActiveSubdomain());

      await expect(service.createSubdomain(tenantId, 'test-slug')).rejects.toThrow(
        DuplicateResourceException,
      );
    });
  });

  describe('addCustomDomain', () => {
    it('커스텀 도메인을 정상 추가한다', async () => {
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(null);
      domainRepo.save.mockImplementation(async (entity) => entity as DomainEntity);

      const result = await service.addCustomDomain(userId, tenantId, {
        domain: 'haru.company.com',
        dnsProvider: 'CLOUDFLARE',
        cloudflareZoneId: 'zone-123',
      });

      expect(result.domain).toBe('haru.company.com');
      expect(result.type).toBe('CUSTOM');
      expect(result.status).toBe('PENDING');
      expect(result.isPrimary).toBe(false);
    });

    it('소유자가 아니면 ResourceNotFoundException을 던진다', async () => {
      tenantService.findOne.mockRejectedValue(
        new ResourceNotFoundException('Tenant', tenantId),
      );

      await expect(
        service.addCustomDomain(userId, tenantId, {
          domain: 'haru.company.com',
          dnsProvider: 'CLOUDFLARE',
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('도메인 중복 시 DuplicateResourceException을 던진다', async () => {
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(createPendingDomain());

      await expect(
        service.addCustomDomain(userId, tenantId, {
          domain: 'haru.company.com',
          dnsProvider: 'CLOUDFLARE',
        }),
      ).rejects.toThrow(DuplicateResourceException);
    });
  });

  describe('findByTenantId', () => {
    it('테넌트 소유 도메인 목록을 반환한다', async () => {
      tenantService.findOne.mockResolvedValue(tenantResponse);
      const subdomain = createActiveSubdomain();
      domainRepo.find.mockResolvedValue([subdomain]);

      const result = await service.findByTenantId(userId, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].domain).toBe('test-slug.haruos.app');
      expect(domainRepo.find).toHaveBeenCalledWith({
        where: { tenantId },
        order: { createdAt: 'ASC' },
      });
    });

    it('소유자가 아니면 ResourceNotFoundException을 던진다', async () => {
      tenantService.findOne.mockRejectedValue(
        new ResourceNotFoundException('Tenant', tenantId),
      );

      await expect(service.findByTenantId(userId, tenantId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('커스텀 도메인을 삭제한다', async () => {
      const domain = createActiveDomain();
      domain.isPrimary = false;
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(domain);
      domainRepo.remove.mockResolvedValue(domain);

      await service.remove(userId, tenantId, domainId);

      expect(domainRepo.remove).toHaveBeenCalledWith(domain);
    });

    it('기본 도메인 삭제 시 ValidationException을 던진다', async () => {
      const domain = createActiveSubdomain();
      domain.isPrimary = true;
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(domain);

      await expect(service.remove(userId, tenantId, domainId)).rejects.toThrow(
        ValidationException,
      );
    });

    it('도메인이 없으면 ResourceNotFoundException을 던진다', async () => {
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(userId, tenantId, domainId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('setPrimary', () => {
    it('ACTIVE 도메인을 primary로 설정한다', async () => {
      const domain = createActiveDomain();
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(domain);
      domainRepo.update.mockResolvedValue({ affected: 1 } as any);
      domainRepo.save.mockImplementation(async (entity) => entity as DomainEntity);

      const result = await service.setPrimary(userId, tenantId, domainId);

      expect(result.isPrimary).toBe(true);
      expect(domainRepo.update).toHaveBeenCalledWith(
        { tenantId, isPrimary: true },
        { isPrimary: false },
      );
    });

    it('PENDING 도메인을 primary로 설정 시 ValidationException을 던진다', async () => {
      const domain = createPendingDomain();
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(domain);

      await expect(service.setPrimary(userId, tenantId, domainId)).rejects.toThrow(
        ValidationException,
      );
    });
  });

  describe('verifyDns', () => {
    it('PENDING 도메인을 VERIFIED로 전이한다', async () => {
      const domain = createPendingDomain();
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(domain);
      domainRepo.save.mockImplementation(async (entity) => entity as DomainEntity);

      const result = await service.verifyDns(userId, tenantId, domainId);

      expect(result.status).toBe('VERIFIED');
    });

    it('ACTIVE 도메인에 verify 시 InvalidStateTransitionException을 던진다', async () => {
      const domain = createActiveDomain();
      tenantService.findOne.mockResolvedValue(tenantResponse);
      domainRepo.findOne.mockResolvedValue(domain);

      await expect(service.verifyDns(userId, tenantId, domainId)).rejects.toThrow(
        InvalidStateTransitionException,
      );
    });
  });

  describe('validateCloudflare', () => {
    const dto = { apiToken: 'cf-token-xxx', zoneId: 'zone-id-xxx' };

    beforeEach(() => {
      tenantService.findOne.mockResolvedValue(tenantResponse);
    });

    it('유효한 Cloudflare 토큰과 Zone ID를 검증한다', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          result: { name: 'example.com', status: 'active' },
        }),
      };
      global.fetch = jest.fn().mockResolvedValue(mockResponse);

      const result = await service.validateCloudflare(userId, tenantId, dto);

      expect(result.valid).toBe(true);
      expect(result.zoneName).toBe('example.com');
      expect(result.zoneStatus).toBe('active');
      expect(global.fetch).toHaveBeenCalledWith(
        `https://api.cloudflare.com/client/v4/zones/${dto.zoneId}`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${dto.apiToken}`,
          }),
        }),
      );
    });

    it('인증 실패 시 ValidationException을 던진다', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(service.validateCloudflare(userId, tenantId, dto)).rejects.toThrow(
        ValidationException,
      );
    });

    it('Cloudflare API 오류 시 ExternalApiException을 던진다', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(service.validateCloudflare(userId, tenantId, dto)).rejects.toThrow(
        ExternalApiException,
      );
    });

    it('네트워크 오류 시 ExternalApiException을 던진다', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.validateCloudflare(userId, tenantId, dto)).rejects.toThrow(
        ExternalApiException,
      );
    });

    it('소유자가 아니면 ResourceNotFoundException을 던진다', async () => {
      tenantService.findOne.mockRejectedValue(
        new ResourceNotFoundException('Tenant', tenantId),
      );

      await expect(service.validateCloudflare(userId, tenantId, dto)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('DomainEntity 상태 전이', () => {
    it('PENDING -> VERIFIED -> ACTIVE 정상 전이', () => {
      const domain = createPendingDomain();
      expect(domain.status).toBe('PENDING');

      domain.verify();
      expect(domain.status).toBe('VERIFIED');
      expect(domain.dnsVerifiedAt).toBeDefined();

      domain.activate();
      expect(domain.status).toBe('ACTIVE');
    });

    it('ACTIVE에서 verify() 호출 시 InvalidStateTransitionException', () => {
      const domain = createActiveDomain();
      expect(() => domain.verify()).toThrow(InvalidStateTransitionException);
    });

    it('PENDING에서 activate() 호출 시 InvalidStateTransitionException', () => {
      const domain = createPendingDomain();
      expect(() => domain.activate()).toThrow(InvalidStateTransitionException);
    });

    it('어떤 상태에서든 fail() 호출 가능', () => {
      const domain = createPendingDomain();
      domain.fail();
      expect(domain.status).toBe('FAILED');
    });
  });
});
