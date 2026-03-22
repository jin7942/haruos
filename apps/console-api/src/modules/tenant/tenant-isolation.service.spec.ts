import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TenantIsolationService, ISOLATION_LEVEL } from './tenant-isolation.service';

describe('TenantIsolationService', () => {
  let service: TenantIsolationService;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantIsolationService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TenantIsolationService>(TenantIsolationService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    jest.clearAllMocks();
  });

  describe('getS3Prefix', () => {
    it('테넌트 ID 기반 S3 prefix를 반환한다', () => {
      const prefix = service.getS3Prefix('tenant-abc');
      expect(prefix).toBe('tenants/tenant-abc/');
    });
  });

  describe('buildS3Key', () => {
    it('prefix를 포함한 전체 S3 키를 생성한다', () => {
      const key = service.buildS3Key('tenant-abc', 'documents/report.pdf');
      expect(key).toBe('tenants/tenant-abc/documents/report.pdf');
    });

    it('선행 슬래시를 제거한다', () => {
      const key = service.buildS3Key('tenant-abc', '/uploads/image.png');
      expect(key).toBe('tenants/tenant-abc/uploads/image.png');
    });
  });

  describe('validateS3KeyOwnership', () => {
    it('해당 테넌트 prefix에 속하면 true를 반환한다', () => {
      expect(
        service.validateS3KeyOwnership('tenant-abc', 'tenants/tenant-abc/file.txt'),
      ).toBe(true);
    });

    it('다른 테넌트 prefix에 속하면 false를 반환한다', () => {
      expect(
        service.validateS3KeyOwnership('tenant-abc', 'tenants/tenant-xyz/file.txt'),
      ).toBe(false);
    });

    it('prefix가 없는 키는 false를 반환한다', () => {
      expect(
        service.validateS3KeyOwnership('tenant-abc', 'some-random-key'),
      ).toBe(false);
    });
  });

  describe('getIsolationLevel', () => {
    it('기본값은 DEDICATED이다', () => {
      mockConfigService.get.mockReturnValue(ISOLATION_LEVEL.DEDICATED);
      expect(service.getIsolationLevel('STARTER')).toBe(ISOLATION_LEVEL.DEDICATED);
    });

    it('환경변수로 SHARED 설정 시 SHARED를 반환한다', () => {
      mockConfigService.get.mockReturnValue(ISOLATION_LEVEL.SHARED);
      expect(service.getIsolationLevel('STARTER')).toBe(ISOLATION_LEVEL.SHARED);
    });
  });

  describe('requiresDedicatedSecurityGroup', () => {
    it('DEDICATED 격리 수준이면 true를 반환한다', () => {
      mockConfigService.get.mockReturnValue(ISOLATION_LEVEL.DEDICATED);
      expect(service.requiresDedicatedSecurityGroup('STARTER')).toBe(true);
    });

    it('SHARED 격리 수준이면 false를 반환한다', () => {
      mockConfigService.get.mockReturnValue(ISOLATION_LEVEL.SHARED);
      expect(service.requiresDedicatedSecurityGroup('STARTER')).toBe(false);
    });
  });
});
