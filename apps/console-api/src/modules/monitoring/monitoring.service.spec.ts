import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonitoringService } from './monitoring.service';
import { TenantService } from '../tenant/tenant.service';
import { MetricEntity } from './entities/metric.entity';
import { CostRecordEntity } from './entities/cost-record.entity';
import { AiUsageRecordEntity } from './entities/ai-usage-record.entity';
import { AlertConfigEntity } from './entities/alert-config.entity';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

const mockTenantService = {
  findOne: jest.fn(),
};

function createMockRepository(): Partial<Repository<any>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('MonitoringService', () => {
  let service: MonitoringService;
  let metricRepo: jest.Mocked<Partial<Repository<MetricEntity>>>;
  let costRepo: jest.Mocked<Partial<Repository<CostRecordEntity>>>;
  let aiUsageRepo: jest.Mocked<Partial<Repository<AiUsageRecordEntity>>>;
  let alertRepo: jest.Mocked<Partial<Repository<AlertConfigEntity>>>;

  const userId = 'user-1';
  const tenantId = 'tenant-1';

  beforeEach(async () => {
    metricRepo = createMockRepository() as any;
    costRepo = createMockRepository() as any;
    aiUsageRepo = createMockRepository() as any;
    alertRepo = createMockRepository() as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: TenantService, useValue: mockTenantService },
        { provide: getRepositoryToken(MetricEntity), useValue: metricRepo },
        { provide: getRepositoryToken(CostRecordEntity), useValue: costRepo },
        { provide: getRepositoryToken(AiUsageRecordEntity), useValue: aiUsageRepo },
        { provide: getRepositoryToken(AlertConfigEntity), useValue: alertRepo },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);

    mockTenantService.findOne.mockReset();
  });

  describe('findMetrics', () => {
    it('소유권 검증 후 메트릭을 반환한다', async () => {
      mockTenantService.findOne.mockResolvedValue({ id: tenantId });
      const entity: Partial<MetricEntity> = {
        id: 'm-1',
        tenantId,
        metricType: 'ECS_CPU',
        value: 45.5,
        unit: 'Percent',
        collectedAt: new Date('2026-03-20T00:00:00Z'),
      };
      (metricRepo.find as jest.Mock).mockResolvedValue([entity]);

      const result = await service.findMetrics(userId, tenantId);

      expect(mockTenantService.findOne).toHaveBeenCalledWith(userId, tenantId);
      expect(result).toHaveLength(1);
      expect(result[0].metricType).toBe('ECS_CPU');
      expect(result[0].value).toBe(45.5);
    });

    it('소유권 검증 실패 시 예외를 전파한다', async () => {
      mockTenantService.findOne.mockRejectedValue(
        new ResourceNotFoundException('Tenant', tenantId),
      );

      await expect(service.findMetrics(userId, tenantId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('findCosts', () => {
    it('비용 기록을 반환한다', async () => {
      mockTenantService.findOne.mockResolvedValue({ id: tenantId });
      const entity: Partial<CostRecordEntity> = {
        id: 'c-1',
        tenantId,
        service: 'RDS',
        cost: 12.5,
        currency: 'USD',
        periodStart: new Date('2026-03-01'),
        periodEnd: new Date('2026-03-31'),
      };
      (costRepo.find as jest.Mock).mockResolvedValue([entity]);

      const result = await service.findCosts(userId, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].service).toBe('RDS');
      expect(result[0].cost).toBe(12.5);
    });
  });

  describe('findCostBreakdown', () => {
    it('서비스별 비용 합계를 반환한다', async () => {
      mockTenantService.findOne.mockResolvedValue({ id: tenantId });

      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { service: 'RDS', cost: '25.00', currency: 'USD' },
          { service: 'ECS', cost: '10.50', currency: 'USD' },
        ]),
      };
      (costRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const result = await service.findCostBreakdown(userId, tenantId);

      expect(result).toHaveLength(2);
      expect(result[0].service).toBe('RDS');
      expect(result[0].cost).toBe(25);
      expect(result[1].service).toBe('ECS');
      expect(result[1].cost).toBe(10.5);
    });
  });

  describe('findAiUsage', () => {
    it('AI 사용량 기록을 반환한다', async () => {
      mockTenantService.findOne.mockResolvedValue({ id: tenantId });
      const entity: Partial<AiUsageRecordEntity> = {
        id: 'ai-1',
        tenantId,
        modelId: 'anthropic.claude-3-sonnet',
        inputTokens: 1000,
        outputTokens: 500,
        estimatedCost: 0.003,
        collectedAt: new Date('2026-03-20T00:00:00Z'),
      };
      (aiUsageRepo.find as jest.Mock).mockResolvedValue([entity]);

      const result = await service.findAiUsage(userId, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].modelId).toBe('anthropic.claude-3-sonnet');
      expect(result[0].inputTokens).toBe(1000);
    });
  });

  describe('findAlerts', () => {
    it('알림 설정 목록을 반환한다', async () => {
      mockTenantService.findOne.mockResolvedValue({ id: tenantId });
      const entity: Partial<AlertConfigEntity> = {
        id: 'a-1',
        tenantId,
        alertType: 'COST',
        threshold: 100,
        isEnabled: true,
        lastTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (alertRepo.find as jest.Mock).mockResolvedValue([entity]);

      const result = await service.findAlerts(userId, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].alertType).toBe('COST');
      expect(result[0].threshold).toBe(100);
    });
  });

  describe('updateAlert', () => {
    it('알림 설정을 수정한다', async () => {
      mockTenantService.findOne.mockResolvedValue({ id: tenantId });
      const entity: Partial<AlertConfigEntity> = {
        id: 'a-1',
        tenantId,
        alertType: 'COST',
        threshold: 100,
        isEnabled: true,
        lastTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (alertRepo.findOne as jest.Mock).mockResolvedValue(entity);
      (alertRepo.save as jest.Mock).mockResolvedValue({ ...entity, threshold: 200, isEnabled: false });

      const result = await service.updateAlert(userId, tenantId, 'a-1', {
        threshold: 200,
        isEnabled: false,
      });

      expect(alertRepo.save).toHaveBeenCalled();
      expect(result.threshold).toBe(200);
      expect(result.isEnabled).toBe(false);
    });

    it('존재하지 않는 알림 설정이면 예외를 던진다', async () => {
      mockTenantService.findOne.mockResolvedValue({ id: tenantId });
      (alertRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateAlert(userId, tenantId, 'not-exist', { threshold: 50 }),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
