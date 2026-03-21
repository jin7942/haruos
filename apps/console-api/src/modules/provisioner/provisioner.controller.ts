import { Controller, Post, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProvisionerFacade } from './provisioner.service';
import { ProvisioningJobResponseDto } from './dto/provisioning-job.response.dto';
import { ProvisioningLogResponseDto } from './dto/provisioning-log.response.dto';

@ApiTags('Provisioner')
@ApiBearerAuth()
@Controller('tenants/:tenantId/provision')
export class ProvisionerController {
  constructor(private readonly provisionerFacade: ProvisionerFacade) {}

  /**
   * 테넌트 프로비저닝 시작.
   */
  @Post()
  @ApiOperation({ summary: '프로비저닝 시작' })
  @ApiResponse({ status: 201, type: ProvisioningJobResponseDto })
  startProvisioning(
    @Param('tenantId') tenantId: string,
  ): Promise<ProvisioningJobResponseDto> {
    return this.provisionerFacade.startProvisioning(tenantId, {});
  }

  /**
   * 프로비저닝 상태 조회.
   */
  @Get('status')
  @ApiOperation({ summary: '프로비저닝 상태 조회' })
  @ApiResponse({ status: 200, type: ProvisioningJobResponseDto })
  getStatus(
    @Param('tenantId') tenantId: string,
  ): Promise<ProvisioningJobResponseDto> {
    return this.provisionerFacade.getStatus(tenantId);
  }

  /**
   * 프로비저닝 로그 조회.
   */
  @Get('logs')
  @ApiOperation({ summary: '프로비저닝 로그 조회' })
  @ApiResponse({ status: 200, type: [ProvisioningLogResponseDto] })
  getLogs(
    @Param('tenantId') tenantId: string,
  ): Promise<ProvisioningLogResponseDto[]> {
    return this.provisionerFacade.getLogs(tenantId);
  }

  /**
   * 실패한 프로비저닝 롤백.
   */
  @Post('rollback')
  @ApiOperation({ summary: '프로비저닝 롤백' })
  @ApiResponse({ status: 201, type: ProvisioningJobResponseDto })
  rollback(
    @Param('tenantId') tenantId: string,
  ): Promise<ProvisioningJobResponseDto> {
    return this.provisionerFacade.rollback(tenantId);
  }
}
