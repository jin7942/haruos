import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProvisionerFacade } from './provisioner.service';
import { TerraformPort } from './ports/terraform.port';
import { AnsiblePort } from './ports/ansible.port';
import { DnsPort } from './ports/dns.port';
import { ProvisioningJobEntity } from './entities/provisioning-job.entity';
import { ProvisioningLogEntity } from './entities/provisioning-log.entity';
import { TenantInfraEntity } from './entities/tenant-infra.entity';
import { ResourceNotFoundException, InvalidStateTransitionException } from '../../common/exceptions/business.exception';

describe('ProvisionerFacade', () => {
  let facade: ProvisionerFacade;
  let jobRepository: jest.Mocked<Repository<ProvisioningJobEntity>>;
  let logRepository: jest.Mocked<Repository<ProvisioningLogEntity>>;
  let infraRepository: jest.Mocked<Repository<TenantInfraEntity>>;
  let terraformPort: jest.Mocked<TerraformPort>;
  let ansiblePort: jest.Mocked<AnsiblePort>;
  let dnsPort: jest.Mocked<DnsPort>;

  beforeEach(async () => {
    const mockJobRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: entity.id || 'job-1' })),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const mockLogRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: entity.id || 'log-1' })),
      find: jest.fn().mockResolvedValue([]),
    };

    const mockInfraRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: entity.id || 'infra-1' })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const mockTerraform: Partial<TerraformPort> = {
      plan: jest.fn().mockResolvedValue('plan output'),
      apply: jest.fn().mockResolvedValue('apply output'),
      destroy: jest.fn().mockResolvedValue('destroy output'),
    };

    const mockAnsible: Partial<AnsiblePort> = {
      runPlaybook: jest.fn().mockResolvedValue('playbook output'),
    };

    const mockDns: Partial<DnsPort> = {
      createRecord: jest.fn().mockResolvedValue('record-id'),
      deleteRecord: jest.fn().mockResolvedValue(undefined),
      verifyDns: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvisionerFacade,
        { provide: getRepositoryToken(ProvisioningJobEntity), useValue: mockJobRepo },
        { provide: getRepositoryToken(ProvisioningLogEntity), useValue: mockLogRepo },
        { provide: getRepositoryToken(TenantInfraEntity), useValue: mockInfraRepo },
        { provide: TerraformPort, useValue: mockTerraform },
        { provide: AnsiblePort, useValue: mockAnsible },
        { provide: DnsPort, useValue: mockDns },
      ],
    }).compile();

    facade = module.get(ProvisionerFacade);
    jobRepository = module.get(getRepositoryToken(ProvisioningJobEntity));
    logRepository = module.get(getRepositoryToken(ProvisioningLogEntity));
    infraRepository = module.get(getRepositoryToken(TenantInfraEntity));
    terraformPort = module.get(TerraformPort);
    ansiblePort = module.get(AnsiblePort);
    dnsPort = module.get(DnsPort);
  });

  describe('startProvisioning', () => {
    it('작업을 생성하고 DTO를 반환한다', async () => {
      const result = await facade.startProvisioning('tenant-1', { slug: 'myteam', region: 'ap-northeast-2' });

      expect(result.tenantId).toBe('tenant-1');
      expect(result.totalSteps).toBe(5);
      expect(jobRepository.save).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('최근 작업 상태를 반환한다', async () => {
      const job = ProvisioningJobEntity.create('tenant-1', 5);
      job.id = 'job-1';
      jobRepository.findOne.mockResolvedValue(job);

      const result = await facade.getStatus('tenant-1');

      expect(result.tenantId).toBe('tenant-1');
      expect(result.status).toBe('PENDING');
    });

    it('작업이 없으면 ResourceNotFoundException을 던진다', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(facade.getStatus('nonexistent')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('getLogs', () => {
    it('작업이 없으면 ResourceNotFoundException을 던진다', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(facade.getLogs('nonexistent')).rejects.toThrow(ResourceNotFoundException);
    });

    it('로그 목록을 반환한다', async () => {
      const job = ProvisioningJobEntity.create('tenant-1', 5);
      job.id = 'job-1';
      jobRepository.findOne.mockResolvedValue(job);

      const log = ProvisioningLogEntity.of('job-1', 'TERRAFORM_PLAN', 'COMPLETED', 'done');
      log.id = 'log-1';
      logRepository.find.mockResolvedValue([log]);

      const result = await facade.getLogs('tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].step).toBe('TERRAFORM_PLAN');
    });
  });

  describe('rollback', () => {
    it('FAILED 상태 작업을 롤백한다', async () => {
      const job = ProvisioningJobEntity.create('tenant-1', 5);
      job.id = 'job-1';
      job.status = 'IN_PROGRESS';
      job.startedAt = new Date();
      job.fail('some error');
      jobRepository.findOne.mockResolvedValue(job);

      const result = await facade.rollback('tenant-1');

      expect(result.status).toBe('ROLLING_BACK');
      expect(jobRepository.save).toHaveBeenCalled();
    });

    it('FAILED가 아닌 작업은 롤백할 수 없다', async () => {
      const job = ProvisioningJobEntity.create('tenant-1', 5);
      job.id = 'job-1';
      jobRepository.findOne.mockResolvedValue(job);

      await expect(facade.rollback('tenant-1')).rejects.toThrow(InvalidStateTransitionException);
    });

    it('작업이 없으면 ResourceNotFoundException을 던진다', async () => {
      jobRepository.findOne.mockResolvedValue(null);

      await expect(facade.rollback('nonexistent')).rejects.toThrow(ResourceNotFoundException);
    });
  });
});

describe('ProvisioningJobEntity', () => {
  it('PENDING -> IN_PROGRESS 전이 성공', () => {
    const job = ProvisioningJobEntity.create('tenant-1', 5);
    job.start();
    expect(job.status).toBe('IN_PROGRESS');
    expect(job.startedAt).toBeInstanceOf(Date);
  });

  it('IN_PROGRESS -> COMPLETED 전이 성공', () => {
    const job = ProvisioningJobEntity.create('tenant-1', 5);
    job.start();
    job.complete();
    expect(job.status).toBe('COMPLETED');
    expect(job.completedAt).toBeInstanceOf(Date);
  });

  it('IN_PROGRESS -> FAILED 전이 성공', () => {
    const job = ProvisioningJobEntity.create('tenant-1', 5);
    job.start();
    job.fail('error');
    expect(job.status).toBe('FAILED');
    expect(job.errorMessage).toBe('error');
  });

  it('FAILED -> ROLLING_BACK 전이 성공', () => {
    const job = ProvisioningJobEntity.create('tenant-1', 5);
    job.start();
    job.fail('error');
    job.rollback();
    expect(job.status).toBe('ROLLING_BACK');
  });

  it('ROLLING_BACK -> ROLLED_BACK 전이 성공', () => {
    const job = ProvisioningJobEntity.create('tenant-1', 5);
    job.start();
    job.fail('error');
    job.rollback();
    job.completeRollback();
    expect(job.status).toBe('ROLLED_BACK');
  });

  it('잘못된 상태 전이 시 예외 발생', () => {
    const job = ProvisioningJobEntity.create('tenant-1', 5);
    expect(() => job.complete()).toThrow(InvalidStateTransitionException);
    expect(() => job.fail('err')).toThrow(InvalidStateTransitionException);
    expect(() => job.rollback()).toThrow(InvalidStateTransitionException);
  });

  it('advanceStep으로 단계 진행', () => {
    const job = ProvisioningJobEntity.create('tenant-1', 5);
    job.advanceStep('TERRAFORM_PLAN');
    expect(job.currentStep).toBe('TERRAFORM_PLAN');
    expect(job.completedSteps).toBe(1);
  });
});
