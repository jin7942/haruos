import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { UserEntity } from '../auth/entities/user.entity';
import { TenantEntity } from '../tenant/entities/tenant.entity';
import { SubscriptionEntity } from '../billing/entities/subscription.entity';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

describe('AdminService', () => {
  let service: AdminService;
  let userRepo: jest.Mocked<Repository<UserEntity>>;
  let tenantRepo: jest.Mocked<Repository<TenantEntity>>;
  let subscriptionRepo: jest.Mocked<Repository<SubscriptionEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TenantEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SubscriptionEntity),
          useValue: {
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    tenantRepo = module.get(getRepositoryToken(TenantEntity));
    subscriptionRepo = module.get(getRepositoryToken(SubscriptionEntity));
  });

  describe('getDashboard', () => {
    it('전체 통계를 집계하여 반환한다', async () => {
      tenantRepo.count
        .mockResolvedValueOnce(10) // totalTenants
        .mockResolvedValueOnce(5)  // activeTenants
        .mockResolvedValueOnce(3)  // trialTenants (CREATING)
        .mockResolvedValueOnce(2); // suspendedTenants
      userRepo.count
        .mockResolvedValueOnce(20)  // totalUsers
        .mockResolvedValueOnce(15); // verifiedUsers
      subscriptionRepo.count
        .mockResolvedValueOnce(4); // activeSubscriptions

      const result = await service.getDashboard();

      expect(result.totalTenants).toBe(10);
      expect(result.activeTenants).toBe(5);
      expect(result.trialTenants).toBe(3);
      expect(result.suspendedTenants).toBe(2);
      expect(result.totalUsers).toBe(20);
      expect(result.verifiedUsers).toBe(15);
      expect(result.activeSubscriptions).toBe(4);
    });
  });

  describe('getAllTenants', () => {
    it('전체 테넌트 목록을 반환한다', async () => {
      const tenant = TenantEntity.create('user-1', '테스트', 'test', 'ap-northeast-2');
      tenant.id = 'tenant-1';
      tenantRepo.find.mockResolvedValue([tenant]);

      const result = await service.getAllTenants();

      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('test');
      expect(tenantRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('suspendTenant', () => {
    it('테넌트를 일시 중지한다', async () => {
      const tenant = TenantEntity.create('user-1', '테스트', 'test', 'ap-northeast-2');
      tenant.id = 'tenant-1';
      tenant.activate();
      tenantRepo.findOne.mockResolvedValue(tenant);
      tenantRepo.save.mockImplementation(async (entity) => entity as TenantEntity);

      const result = await service.suspendTenant('tenant-1');

      expect(result.status).toBe('SUSPENDED');
      expect(tenantRepo.save).toHaveBeenCalled();
    });

    it('테넌트가 없으면 ResourceNotFoundException을 던진다', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(service.suspendTenant('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('resumeTenant', () => {
    it('테넌트를 재개한다', async () => {
      const tenant = TenantEntity.create('user-1', '테스트', 'test', 'ap-northeast-2');
      tenant.id = 'tenant-1';
      tenant.activate();
      tenant.suspend();
      tenantRepo.findOne.mockResolvedValue(tenant);
      tenantRepo.save.mockImplementation(async (entity) => entity as TenantEntity);

      const result = await service.resumeTenant('tenant-1');

      expect(result.status).toBe('ACTIVE');
      expect(tenantRepo.save).toHaveBeenCalled();
    });

    it('테넌트가 없으면 ResourceNotFoundException을 던진다', async () => {
      tenantRepo.findOne.mockResolvedValue(null);

      await expect(service.resumeTenant('nonexistent')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('getAllUsers', () => {
    it('전체 사용자 목록을 반환한다', async () => {
      const user = {
        id: 'user-1',
        email: 'test@test.com',
        name: '테스트',
        role: 'USER' as const,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as UserEntity;
      userRepo.find.mockResolvedValue([user]);

      const result = await service.getAllUsers();

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('test@test.com');
      expect(result[0].role).toBe('USER');
      expect(userRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });
});
