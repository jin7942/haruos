import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantService } from '../tenant/tenant.service';
import { MetricEntity } from './entities/metric.entity';
import { CostRecordEntity } from './entities/cost-record.entity';
import { AiUsageRecordEntity } from './entities/ai-usage-record.entity';
import { AlertConfigEntity } from './entities/alert-config.entity';
import { MetricResponseDto } from './dto/metric.response.dto';
import { CostResponseDto } from './dto/cost.response.dto';
import { AiUsageResponseDto } from './dto/ai-usage.response.dto';
import { AlertConfigResponseDto } from './dto/alert-config.response.dto';
import { UpdateAlertRequestDto } from './dto/update-alert.request.dto';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(MetricEntity)
    private readonly metricRepository: Repository<MetricEntity>,
    @InjectRepository(CostRecordEntity)
    private readonly costRecordRepository: Repository<CostRecordEntity>,
    @InjectRepository(AiUsageRecordEntity)
    private readonly aiUsageRecordRepository: Repository<AiUsageRecordEntity>,
    @InjectRepository(AlertConfigEntity)
    private readonly alertConfigRepository: Repository<AlertConfigEntity>,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * 테넌트 메트릭 조회. 소유권 검증 후 최근 메트릭을 반환한다.
   *
   * @param userId - JWT에서 추출한 사용자 ID
   * @param tenantId - 테넌트 ID
   * @returns 메트릭 목록
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async findMetrics(userId: string, tenantId: string): Promise<MetricResponseDto[]> {
    await this.tenantService.findOne(userId, tenantId);

    const metrics = await this.metricRepository.find({
      where: { tenantId },
      order: { collectedAt: 'DESC' },
      take: 100,
    });
    return metrics.map(MetricResponseDto.from);
  }

  /**
   * 테넌트 비용 조회. 소유권 검증 후 비용 기록을 반환한다.
   *
   * @param userId - JWT에서 추출한 사용자 ID
   * @param tenantId - 테넌트 ID
   * @returns 비용 기록 목록
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async findCosts(userId: string, tenantId: string): Promise<CostResponseDto[]> {
    await this.tenantService.findOne(userId, tenantId);

    const costs = await this.costRecordRepository.find({
      where: { tenantId },
      order: { periodStart: 'DESC' },
      take: 100,
    });
    return costs.map(CostResponseDto.from);
  }

  /**
   * 테넌트 서비스별 비용 상세 조회.
   *
   * @param userId - JWT에서 추출한 사용자 ID
   * @param tenantId - 테넌트 ID
   * @returns 서비스별 비용 내역
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async findCostBreakdown(userId: string, tenantId: string): Promise<CostResponseDto[]> {
    await this.tenantService.findOne(userId, tenantId);

    const costs = await this.costRecordRepository
      .createQueryBuilder('cr')
      .select('cr.service', 'service')
      .addSelect('SUM(cr.cost)', 'cost')
      .addSelect('cr.currency', 'currency')
      .where('cr.tenant_id = :tenantId', { tenantId })
      .groupBy('cr.service')
      .addGroupBy('cr.currency')
      .getRawMany();

    return costs.map((row) => {
      const dto = new CostResponseDto();
      dto.service = row.service;
      dto.cost = Number(row.cost);
      dto.currency = row.currency;
      return dto;
    });
  }

  /**
   * 테넌트 AI 사용량 조회.
   *
   * @param userId - JWT에서 추출한 사용자 ID
   * @param tenantId - 테넌트 ID
   * @returns AI 사용량 기록 목록
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async findAiUsage(userId: string, tenantId: string): Promise<AiUsageResponseDto[]> {
    await this.tenantService.findOne(userId, tenantId);

    const records = await this.aiUsageRecordRepository.find({
      where: { tenantId },
      order: { collectedAt: 'DESC' },
      take: 100,
    });
    return records.map(AiUsageResponseDto.from);
  }

  /**
   * 테넌트 알림 설정 목록 조회.
   *
   * @param userId - JWT에서 추출한 사용자 ID
   * @param tenantId - 테넌트 ID
   * @returns 알림 설정 목록
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async findAlerts(userId: string, tenantId: string): Promise<AlertConfigResponseDto[]> {
    await this.tenantService.findOne(userId, tenantId);

    const alerts = await this.alertConfigRepository.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
    return alerts.map(AlertConfigResponseDto.from);
  }

  /**
   * 알림 설정 수정. 임계값, 활성화 여부를 변경한다.
   *
   * @param userId - JWT에서 추출한 사용자 ID
   * @param tenantId - 테넌트 ID
   * @param alertId - 알림 설정 ID
   * @param dto - 수정할 필드
   * @returns 수정된 알림 설정
   * @throws ResourceNotFoundException 테넌트 또는 알림 설정이 없는 경우
   */
  async updateAlert(
    userId: string,
    tenantId: string,
    alertId: string,
    dto: UpdateAlertRequestDto,
  ): Promise<AlertConfigResponseDto> {
    await this.tenantService.findOne(userId, tenantId);

    const alert = await this.alertConfigRepository.findOne({
      where: { id: alertId, tenantId },
    });
    if (!alert) {
      throw new ResourceNotFoundException('AlertConfig', alertId);
    }

    if (dto.threshold !== undefined) alert.threshold = dto.threshold;
    if (dto.isEnabled !== undefined) alert.isEnabled = dto.isEnabled;

    await this.alertConfigRepository.save(alert);
    return AlertConfigResponseDto.from(alert);
  }
}
