import { Controller, Get, Patch, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { MonitoringService } from './monitoring.service';
import { MetricResponseDto } from './dto/metric.response.dto';
import { CostResponseDto } from './dto/cost.response.dto';
import { AiUsageResponseDto } from './dto/ai-usage.response.dto';
import { AlertConfigResponseDto } from './dto/alert-config.response.dto';
import { UpdateAlertRequestDto } from './dto/update-alert.request.dto';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('tenants/:tenantId')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('metrics')
  @ApiOperation({ summary: '테넌트 메트릭 조회' })
  @ApiResponse({ status: 200, type: [MetricResponseDto] })
  findMetrics(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<MetricResponseDto[]> {
    return this.monitoringService.findMetrics((req as any).user.sub, tenantId);
  }

  @Get('costs')
  @ApiOperation({ summary: '테넌트 비용 조회' })
  @ApiResponse({ status: 200, type: [CostResponseDto] })
  findCosts(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<CostResponseDto[]> {
    return this.monitoringService.findCosts((req as any).user.sub, tenantId);
  }

  @Get('costs/breakdown')
  @ApiOperation({ summary: '테넌트 서비스별 비용 상세' })
  @ApiResponse({ status: 200, type: [CostResponseDto] })
  findCostBreakdown(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<CostResponseDto[]> {
    return this.monitoringService.findCostBreakdown((req as any).user.sub, tenantId);
  }

  @Get('ai-usage')
  @ApiOperation({ summary: '테넌트 AI 사용량 조회' })
  @ApiResponse({ status: 200, type: [AiUsageResponseDto] })
  findAiUsage(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<AiUsageResponseDto[]> {
    return this.monitoringService.findAiUsage((req as any).user.sub, tenantId);
  }

  @Get('alerts')
  @ApiOperation({ summary: '테넌트 알림 설정 목록' })
  @ApiResponse({ status: 200, type: [AlertConfigResponseDto] })
  findAlerts(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<AlertConfigResponseDto[]> {
    return this.monitoringService.findAlerts((req as any).user.sub, tenantId);
  }

  @Patch('alerts/:alertId')
  @ApiOperation({ summary: '알림 설정 수정' })
  @ApiResponse({ status: 200, type: AlertConfigResponseDto })
  updateAlert(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Param('alertId') alertId: string,
    @Body() dto: UpdateAlertRequestDto,
  ): Promise<AlertConfigResponseDto> {
    return this.monitoringService.updateAlert((req as any).user.sub, tenantId, alertId, dto);
  }
}
