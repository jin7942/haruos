import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BackupService } from './backup.service';
import { BackupEntity, BackupStatus, BackupType } from './entities/backup.entity';
import { TenantService } from '../tenant/tenant.service';
import {
  ResourceNotFoundException,
  ValidationException,
} from '../../common/exceptions/business.exception';

describe('BackupService', () => {
  let service: BackupService;
  let backupRepo: jest.Mocked<Repository<BackupEntity>>;
  let tenantService: jest.Mocked<TenantService>;

  const mockBackup: Partial<BackupEntity> = {
    id: 'backup-1',
    tenantId: 'tenant-1',
    type: BackupType.FULL,
    status: BackupStatus.PENDING,
    s3Key: null,
    sizeBytes: null,
    errorMessage: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        {
          provide: getRepositoryToken(BackupEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: TenantService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('haruos-backups'),
          },
        },
      ],
    }).compile();

    service = module.get(BackupService);
    backupRepo = module.get(getRepositoryToken(BackupEntity));
    tenantService = module.get(TenantService);
  });

  describe('createBackup', () => {
    it('백업 레코드를 생성하고 PENDING 상태로 반환한다', async () => {
      backupRepo.save.mockResolvedValue(mockBackup as BackupEntity);
      backupRepo.findOne.mockResolvedValue(
        Object.assign(new BackupEntity(), mockBackup),
      );

      const result = await service.createBackup('user-1', 'tenant-1');

      expect(result.tenantId).toBe('tenant-1');
      expect(result.type).toBe(BackupType.FULL);
      expect(backupRepo.save).toHaveBeenCalled();
    });

    it('테넌트 소유자 검증을 수행한다', async () => {
      tenantService.findOne.mockRejectedValue(
        new ResourceNotFoundException('Tenant', 'tenant-1'),
      );

      await expect(service.createBackup('wrong-user', 'tenant-1')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('exportData', () => {
    it('EXPORT 타입으로 백업을 생성한다', async () => {
      const exportBackup = { ...mockBackup, type: BackupType.EXPORT };
      backupRepo.save.mockResolvedValue(exportBackup as BackupEntity);
      backupRepo.findOne.mockResolvedValue(
        Object.assign(new BackupEntity(), exportBackup),
      );

      const result = await service.exportData('user-1', 'tenant-1');

      expect(result.type).toBe(BackupType.EXPORT);
    });
  });

  describe('getDownloadUrl', () => {
    it('완료된 백업의 다운로드 URL을 반환한다', async () => {
      const completedBackup = {
        ...mockBackup,
        status: BackupStatus.COMPLETED,
        s3Key: 'backups/tenant-1/backup-1.tar.gz',
      };
      backupRepo.findOne.mockResolvedValue(completedBackup as BackupEntity);

      const result = await service.getDownloadUrl('user-1', 'tenant-1', 'backup-1');

      expect(result.url).toContain('backups/tenant-1/backup-1.tar.gz');
      expect(result.expiresIn).toBe(3600);
    });

    it('완료되지 않은 백업 다운로드 시 ValidationException을 던진다', async () => {
      backupRepo.findOne.mockResolvedValue(mockBackup as BackupEntity);

      await expect(
        service.getDownloadUrl('user-1', 'tenant-1', 'backup-1'),
      ).rejects.toThrow(ValidationException);
    });

    it('존재하지 않는 백업 다운로드 시 ResourceNotFoundException을 던진다', async () => {
      backupRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getDownloadUrl('user-1', 'tenant-1', 'not-found'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('findByTenantId', () => {
    it('테넌트의 백업 목록을 반환한다', async () => {
      backupRepo.find.mockResolvedValue([mockBackup as BackupEntity]);

      const result = await service.findByTenantId('user-1', 'tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].tenantId).toBe('tenant-1');
    });
  });
});
