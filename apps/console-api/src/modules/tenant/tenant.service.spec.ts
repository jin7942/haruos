import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantService } from './tenant.service';
import { TenantEntity } from './entities/tenant.entity';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
  InvalidStateTransitionException,
} from '../../common/exceptions/business.exception';

describe('TenantService', () => {
  let service: TenantService;
  let tenantRepo: jest.Mocked<Repository<TenantEntity>>;

  const userId = 'user-uuid-1';
  const tenantId = 'tenant-uuid-1';

  /** ACTIVE 상태의 실제 TenantEntity 인스턴스를 생성한다. */
  function createActiveTenant(): TenantEntity {
    const tenant = TenantEntity.create(userId, '테스트', 'test-slug', 'ap-northeast-2', '설명');
    // create()는 CREATING 상태이므로 activate()로 ACTIVE 전이
    tenant.id = tenantId;
    tenant.activate();
    return tenant;
  }

  /** CREATING 상태의 실제 TenantEntity 인스턴스를 생성한다. */
  function createCreatingTenant(): TenantEntity {
    const tenant = TenantEntity.create(userId, '테스트', 'test-slug', 'ap-northeast-2', '설명');
    tenant.id = tenantId;
    return tenant;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softRemove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
    tenantRepo = module.get(getRepositoryToken(TenantEntity));
  });

  describe('create', () => {
    it('테넌트를 정상 생성한다', async () => {
      tenantRepo.findOne.mockResolvedValue(null);
      tenantRepo.save.mockImplementation(async (entity) => entity as TenantEntity);

      const result = await service.create(userId, {
        name: '테스트',
        slug: 'test-slug',
        region: 'ap-northeast-2',
        description: '설명',
      });

      expect(result.name).toBe('테스트');
      expect(result.slug).toBe('test-slug');
      expect(result.status).toBe('CREATING');
      expect(tenantRepo.save).toHaveBeenCalled();
    });

    it('slug 중복 시 DuplicateResourceException을 던진다', async () => {
      tenantRepo.findOne.mockResolvedValue(createActiveTenant());

      await expect(
        service.create(userId, {
          name: '테스트',
          slug: 'test-slug',
          region: 'ap-northeast-2',
        }),
      ).rejects.toThrow(DuplicateResourceException);
    });
  });

  describe('findAll', () => {
    it('본인 소유 테넌트 목록을 반환한다', async () => {
      const tenant = createActiveTenant();
      tenantRepo.find.mockResolvedValue([tenant]);

      const result = await service.findAll(userId);

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('test-slug');
      expect(tenantRepo.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('소유한 테넌트를 정상 조회한다', async () => {
      tenantRepo.findOne.mockResolvedValue(createActiveTenant());

      const result = await service.findOne(userId, tenantId);

      expect(result.id).toBe(tenantId);
    });

    it('소유자가 아니면 ResourceNotFoundException을 던진다', async () => {
      const tenant = createActiveTenant();
      tenant.userId = 'other-user-id';
      tenantRepo.findOne.mockResolvedValue(tenant);

      await expect(service.findOne(userId, tenantId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('테넌트가 없으면 ResourceNotFoundException을 던진다', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(userId, tenantId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('테넌트 정보를 정상 수정한다', async () => {
      const tenant = createActiveTenant();
      tenantRepo.findOne.mockResolvedValue(tenant);
      tenantRepo.save.mockImplementation(async (entity) => entity as TenantEntity);

      const result = await service.update(userId, tenantId, {
        name: '수정된 이름',
        description: '수정된 설명',
      });

      expect(result.name).toBe('수정된 이름');
      expect(result.description).toBe('수정된 설명');
      expect(tenantRepo.save).toHaveBeenCalled();
    });

    it('소유자가 아니면 ResourceNotFoundException을 던진다', async () => {
      const tenant = createActiveTenant();
      tenant.userId = 'other-user-id';
      tenantRepo.findOne.mockResolvedValue(tenant);

      await expect(
        service.update(userId, tenantId, { name: '수정' }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('remove', () => {
    it('테넌트를 soft delete 한다', async () => {
      const tenant = createActiveTenant();
      tenantRepo.findOne.mockResolvedValue(tenant);
      tenantRepo.softRemove.mockResolvedValue(tenant);

      await service.remove(userId, tenantId);

      expect(tenantRepo.softRemove).toHaveBeenCalledWith(tenant);
    });
  });

  describe('suspend', () => {
    it('ACTIVE 상태에서 SUSPENDED로 정상 전이한다', async () => {
      const tenant = createActiveTenant();
      tenantRepo.findOne.mockResolvedValue(tenant);
      tenantRepo.save.mockImplementation(async (entity) => entity as TenantEntity);

      const result = await service.suspend(userId, tenantId);

      expect(result.status).toBe('SUSPENDED');
      expect(tenantRepo.save).toHaveBeenCalled();
    });

    it('CREATING 상태에서 suspend하면 InvalidStateTransitionException을 던진다', async () => {
      const tenant = createCreatingTenant();
      tenantRepo.findOne.mockResolvedValue(tenant);

      await expect(service.suspend(userId, tenantId)).rejects.toThrow(
        InvalidStateTransitionException,
      );
    });
  });

  describe('resume', () => {
    it('SUSPENDED 상태에서 ACTIVE로 정상 전이한다', async () => {
      const tenant = createActiveTenant();
      tenant.suspend(); // ACTIVE -> SUSPENDED
      tenantRepo.findOne.mockResolvedValue(tenant);
      tenantRepo.save.mockImplementation(async (entity) => entity as TenantEntity);

      const result = await service.resume(userId, tenantId);

      expect(result.status).toBe('ACTIVE');
      expect(tenantRepo.save).toHaveBeenCalled();
    });

    it('ACTIVE 상태에서 resume하면 InvalidStateTransitionException을 던진다', async () => {
      const tenant = createActiveTenant();
      tenantRepo.findOne.mockResolvedValue(tenant);

      await expect(service.resume(userId, tenantId)).rejects.toThrow(
        InvalidStateTransitionException,
      );
    });
  });
});
