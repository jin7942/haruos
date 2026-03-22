import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AwsService } from './aws.service';
import { AwsCredentialEntity } from './entities/aws-credential.entity';
import { AwsCredentialPort } from './ports/aws-credential.port';
import { ResourceNotFoundException, ValidationException } from '../../common/exceptions/business.exception';

describe('AwsService', () => {
  let service: AwsService;
  let credentialRepository: jest.Mocked<Repository<AwsCredentialEntity>>;
  let awsCredentialPort: jest.Mocked<AwsCredentialPort>;
  let configService: jest.Mocked<ConfigService>;

  const mockCredentialRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockAwsCredentialPort = {
    validateRole: jest.fn(),
    assumeRole: jest.fn(),
    checkBedrockAccess: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => defaultValue),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsService,
        { provide: getRepositoryToken(AwsCredentialEntity), useValue: mockCredentialRepository },
        { provide: AwsCredentialPort, useValue: mockAwsCredentialPort },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AwsService>(AwsService);
    credentialRepository = module.get(getRepositoryToken(AwsCredentialEntity));
    awsCredentialPort = module.get(AwsCredentialPort) as jest.Mocked<AwsCredentialPort>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;

    jest.clearAllMocks();
  });

  describe('getCfnTemplateUrl', () => {
    it('CloudFormation URL과 External ID를 반환한다', () => {
      const result = service.getCfnTemplateUrl('tenant-123');

      expect(result.templateUrl).toContain('cloudformation');
      expect(result.templateUrl).toContain('quickcreate');
      expect(result.externalId).toContain('haruos-tenant-123-');
    });
  });

  describe('getCfnLaunchUrl', () => {
    it('Quick Create URL에 stackName, ExternalId 파라미터를 포함한다', () => {
      const result = service.getCfnLaunchUrl('tenant-456');

      expect(result.launchUrl).toContain('cloudformation');
      expect(result.launchUrl).toContain('quickcreate');
      expect(result.launchUrl).toContain('stackName=HaruOS-TrustRole-tenant-4');
      expect(result.launchUrl).toContain('param_ExternalId=');
      expect(result.externalId).toContain('haruos-tenant-456-');
      expect(result.stackName).toContain('HaruOS-TrustRole-');
    });

    it('region 파라미터를 전달하면 해당 리전 URL을 생성한다', () => {
      const result = service.getCfnLaunchUrl('tenant-789', 'us-east-1');

      expect(result.launchUrl).toContain('us-east-1.console.aws.amazon.com');
      expect(result.launchUrl).toContain('region=us-east-1');
    });

    it('region 미지정 시 기본 리전(ap-northeast-2)을 사용한다', () => {
      const result = service.getCfnLaunchUrl('tenant-000');

      expect(result.launchUrl).toContain('ap-northeast-2.console.aws.amazon.com');
    });
  });

  describe('validateCredential', () => {
    const dto = {
      roleArn: 'arn:aws:iam::123456789012:role/HaruOSRole',
      externalId: 'haruos-ext-abc123',
      region: 'ap-northeast-2',
    };

    it('Role 검증 + Bedrock 확인 성공 시 자격증명을 저장하고 반환한다', async () => {
      mockAwsCredentialPort.validateRole.mockResolvedValue(true);
      mockAwsCredentialPort.checkBedrockAccess.mockResolvedValue(true);
      mockCredentialRepository.save.mockImplementation(async (entity) => ({
        ...entity,
        id: 'cred-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.validateCredential('tenant-123', dto);

      expect(awsCredentialPort.validateRole).toHaveBeenCalledWith(
        dto.roleArn,
        dto.externalId,
        dto.region,
      );
      expect(awsCredentialPort.checkBedrockAccess).toHaveBeenCalledWith(
        dto.roleArn,
        dto.externalId,
        dto.region,
      );
      expect(credentialRepository.save).toHaveBeenCalled();
      expect(result.status).toBe('VALIDATED');
      expect(result.tenantId).toBe('tenant-123');
    });

    it('Role 검증 실패 시 ValidationException을 던진다', async () => {
      mockAwsCredentialPort.validateRole.mockResolvedValue(false);

      await expect(service.validateCredential('tenant-123', dto)).rejects.toThrow(
        ValidationException,
      );
      expect(credentialRepository.save).not.toHaveBeenCalled();
    });

    it('Bedrock 접근 불가 시 ValidationException을 던진다', async () => {
      mockAwsCredentialPort.validateRole.mockResolvedValue(true);
      mockAwsCredentialPort.checkBedrockAccess.mockResolvedValue(false);

      await expect(service.validateCredential('tenant-123', dto)).rejects.toThrow(
        ValidationException,
      );
      expect(credentialRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByTenantId', () => {
    it('자격증명이 존재하면 반환한다', async () => {
      const entity = AwsCredentialEntity.create(
        'tenant-123',
        'arn:aws:iam::123456789012:role/HaruOSRole',
        'ext-id',
        'ap-northeast-2',
      );
      Object.assign(entity, { id: 'cred-uuid', createdAt: new Date(), updatedAt: new Date() });
      mockCredentialRepository.findOne.mockResolvedValue(entity);

      const result = await service.findByTenantId('tenant-123');

      expect(result.tenantId).toBe('tenant-123');
      expect(result.roleArn).toBe('arn:aws:iam::123456789012:role/HaruOSRole');
    });

    it('자격증명이 없으면 ResourceNotFoundException을 던진다', async () => {
      mockCredentialRepository.findOne.mockResolvedValue(null);

      await expect(service.findByTenantId('tenant-123')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('assumeRole', () => {
    it('VALIDATED 자격증명이 있으면 임시 자격을 발급한다', async () => {
      const entity = AwsCredentialEntity.create(
        'tenant-123',
        'arn:aws:iam::123456789012:role/HaruOSRole',
        'ext-id',
        'ap-northeast-2',
      );
      entity.validate();
      mockCredentialRepository.findOne.mockResolvedValue(entity);
      mockAwsCredentialPort.assumeRole.mockResolvedValue({
        accessKeyId: 'AKIA...',
        secretAccessKey: 'secret',
        sessionToken: 'token',
      });

      const result = await service.assumeRole('tenant-123');

      expect(result.accessKeyId).toBe('AKIA...');
      expect(awsCredentialPort.assumeRole).toHaveBeenCalledWith(entity.roleArn, entity.externalId);
    });

    it('VALIDATED 자격증명이 없으면 ResourceNotFoundException을 던진다', async () => {
      mockCredentialRepository.findOne.mockResolvedValue(null);

      await expect(service.assumeRole('tenant-123')).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });
});
