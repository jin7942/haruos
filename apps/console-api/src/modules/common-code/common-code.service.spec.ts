import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { CommonCodeService } from './common-code.service';
import { CodeGroupEntity } from './entities/code-group.entity';
import { CodeEntity } from './entities/code.entity';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../../common/exceptions/business.exception';

describe('CommonCodeService', () => {
  let service: CommonCodeService;
  let groupRepo: jest.Mocked<Repository<CodeGroupEntity>>;
  let codeRepo: jest.Mocked<Repository<CodeEntity>>;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockGroup: Partial<CodeGroupEntity> = {
    groupCode: 'TENANT_STATUS',
    name: '테넌트 상태',
    description: '테넌트 상태 코드',
    createdAt: new Date('2026-03-21'),
    updatedAt: new Date('2026-03-21'),
  };

  const mockCode: Partial<CodeEntity> = {
    id: 'code-uuid-1',
    groupCode: 'TENANT_STATUS',
    code: 'ACTIVE',
    name: '활성',
    sortOrder: 1,
    isEnabled: true,
    metadata: null,
    createdAt: new Date('2026-03-21'),
    updatedAt: new Date('2026-03-21'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommonCodeService,
        {
          provide: getRepositoryToken(CodeGroupEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CodeEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommonCodeService>(CommonCodeService);
    groupRepo = module.get(getRepositoryToken(CodeGroupEntity));
    codeRepo = module.get(getRepositoryToken(CodeEntity));
    cacheManager = module.get(CACHE_MANAGER);
  });

  describe('findAllGroups', () => {
    it('캐시 히트 시 DB 호출 없이 캐시 데이터를 반환한다', async () => {
      const cachedData = [{ groupCode: 'TENANT_STATUS', name: '테넌트 상태', description: null }];
      cacheManager.get.mockResolvedValue(cachedData);

      const result = await service.findAllGroups();

      expect(result).toBe(cachedData);
      expect(groupRepo.find).not.toHaveBeenCalled();
    });

    it('캐시 미스 시 DB 조회 후 캐시에 저장한다', async () => {
      cacheManager.get.mockResolvedValue(null);
      groupRepo.find.mockResolvedValue([mockGroup as CodeGroupEntity]);

      const result = await service.findAllGroups();

      expect(groupRepo.find).toHaveBeenCalledWith({ order: { groupCode: 'ASC' } });
      expect(cacheManager.set).toHaveBeenCalledWith(
        'common-code:groups',
        expect.any(Array),
        1800000,
      );
      expect(result).toHaveLength(1);
      expect(result[0].groupCode).toBe('TENANT_STATUS');
    });
  });

  describe('findGroupByCode', () => {
    it('코드 그룹과 하위 코드를 정상 조회한다', async () => {
      cacheManager.get.mockResolvedValue(null);
      groupRepo.findOne.mockResolvedValue(mockGroup as CodeGroupEntity);
      codeRepo.find.mockResolvedValue([mockCode as CodeEntity]);

      const result = await service.findGroupByCode('TENANT_STATUS');

      expect(result.groupCode).toBe('TENANT_STATUS');
      expect(result.codes).toHaveLength(1);
      expect(result.codes![0].code).toBe('ACTIVE');
    });

    it('존재하지 않는 그룹 코드면 ResourceNotFoundException을 던진다', async () => {
      cacheManager.get.mockResolvedValue(null);
      groupRepo.findOne.mockResolvedValue(null);

      await expect(service.findGroupByCode('NONEXISTENT')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('createGroup', () => {
    it('코드 그룹을 정상 생성한다', async () => {
      groupRepo.findOne.mockResolvedValue(null);
      groupRepo.create.mockReturnValue(mockGroup as CodeGroupEntity);
      groupRepo.save.mockResolvedValue(mockGroup as CodeGroupEntity);

      const result = await service.createGroup({
        groupCode: 'TENANT_STATUS',
        name: '테넌트 상태',
        description: '테넌트 상태 코드',
      });

      expect(result.groupCode).toBe('TENANT_STATUS');
      expect(groupRepo.save).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith('common-code:groups');
    });

    it('중복된 그룹 코드면 DuplicateResourceException을 던진다', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as CodeGroupEntity);

      await expect(
        service.createGroup({
          groupCode: 'TENANT_STATUS',
          name: '테넌트 상태',
        }),
      ).rejects.toThrow(DuplicateResourceException);
    });
  });

  describe('createCode', () => {
    it('코드를 정상 생성한다', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as CodeGroupEntity);
      codeRepo.findOne.mockResolvedValue(null);
      codeRepo.create.mockReturnValue(mockCode as CodeEntity);
      codeRepo.save.mockResolvedValue(mockCode as CodeEntity);

      const result = await service.createCode({
        groupCode: 'TENANT_STATUS',
        code: 'ACTIVE',
        name: '활성',
        sortOrder: 1,
        isEnabled: true,
      });

      expect(result.code).toBe('ACTIVE');
      expect(codeRepo.save).toHaveBeenCalled();
      expect(cacheManager.del).toHaveBeenCalledWith('common-code:groups');
      expect(cacheManager.del).toHaveBeenCalledWith('common-code:group:TENANT_STATUS');
    });

    it('그룹이 존재하지 않으면 ResourceNotFoundException을 던진다', async () => {
      groupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createCode({
          groupCode: 'NONEXISTENT',
          code: 'ACTIVE',
          name: '활성',
        }),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('동일 그룹 내 코드가 중복이면 DuplicateResourceException을 던진다', async () => {
      groupRepo.findOne.mockResolvedValue(mockGroup as CodeGroupEntity);
      codeRepo.findOne.mockResolvedValue(mockCode as CodeEntity);

      await expect(
        service.createCode({
          groupCode: 'TENANT_STATUS',
          code: 'ACTIVE',
          name: '활성',
        }),
      ).rejects.toThrow(DuplicateResourceException);
    });
  });

  describe('validateCode', () => {
    it('유효한 코드면 true를 반환한다', async () => {
      // findCodesByGroup -> findGroupByCode 호출 체인
      cacheManager.get.mockResolvedValue(null);
      groupRepo.findOne.mockResolvedValue(mockGroup as CodeGroupEntity);
      codeRepo.find.mockResolvedValue([mockCode as CodeEntity]);

      const result = await service.validateCode('TENANT_STATUS', 'ACTIVE');

      expect(result).toBe(true);
    });

    it('존재하지 않는 코드면 false를 반환한다', async () => {
      cacheManager.get.mockResolvedValue(null);
      groupRepo.findOne.mockResolvedValue(mockGroup as CodeGroupEntity);
      codeRepo.find.mockResolvedValue([mockCode as CodeEntity]);

      const result = await service.validateCode('TENANT_STATUS', 'NONEXISTENT');

      expect(result).toBe(false);
    });

    it('그룹이 존재하지 않으면 false를 반환한다', async () => {
      cacheManager.get.mockResolvedValue(null);
      groupRepo.findOne.mockResolvedValue(null);

      const result = await service.validateCode('NONEXISTENT', 'ACTIVE');

      expect(result).toBe(false);
    });
  });
});
