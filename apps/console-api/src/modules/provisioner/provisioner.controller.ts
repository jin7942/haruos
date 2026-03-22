import { Controller, Post, Get, Param, Sse } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
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
   * 프로비저닝 상태를 SSE 스트리밍으로 전송한다.
   * 단계별 진행 상황을 실시간으로 전달한다.
   * 이벤트 타입: status (상태 변경), log (로그 메시지), done (완료), error (에러).
   */
  @Get('status/stream')
  @ApiOperation({ summary: '프로비저닝 상태 SSE 스트리밍' })
  @Sse()
  streamStatus(@Param('tenantId') tenantId: string): Observable<MessageEvent> {
    return this.provisionerFacade.streamStatus(tenantId);
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
