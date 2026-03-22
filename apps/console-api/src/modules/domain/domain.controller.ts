import { Controller, Get, Post, Delete, Patch, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { DomainService } from './domain.service';
import { CreateDomainRequestDto } from './dto/create-domain.request.dto';
import { ValidateCloudflareRequestDto } from './dto/validate-cloudflare.request.dto';
import { ValidateCloudflareResponseDto } from './dto/validate-cloudflare.response.dto';
import { DomainResponseDto } from './dto/domain.response.dto';

@ApiTags('Domain')
@ApiBearerAuth()
@Controller('tenants/:tenantId/domains')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  /**
   * 커스텀 도메인 추가.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @param dto - 도메인 생성 요청
   * @returns 생성된 도메인 정보
   */
  @Post()
  @ApiOperation({ summary: '커스텀 도메인 추가' })
  @ApiResponse({ status: 201, type: DomainResponseDto })
  create(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateDomainRequestDto,
  ): Promise<DomainResponseDto> {
    return this.domainService.addCustomDomain((req as any).user.sub, tenantId, dto);
  }

  /**
   * 테넌트 도메인 목록 조회.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @returns 도메인 목록
   */
  @Get()
  @ApiOperation({ summary: '도메인 목록 조회' })
  @ApiResponse({ status: 200, type: [DomainResponseDto] })
  findAll(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<DomainResponseDto[]> {
    return this.domainService.findByTenantId((req as any).user.sub, tenantId);
  }

  /**
   * 도메인 삭제. 기본 도메인은 삭제 불가.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @param domainId - 도메인 ID
   */
  @Delete(':domainId')
  @ApiOperation({ summary: '도메인 삭제' })
  @ApiResponse({ status: 200 })
  remove(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ): Promise<void> {
    return this.domainService.remove((req as any).user.sub, tenantId, domainId);
  }

  /**
   * 기본 도메인 변경. ACTIVE 상태의 도메인만 가능.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @param domainId - primary로 설정할 도메인 ID
   * @returns 변경된 도메인 정보
   */
  @Patch(':domainId/set-primary')
  @ApiOperation({ summary: '기본 도메인 변경' })
  @ApiResponse({ status: 200, type: DomainResponseDto })
  setPrimary(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ): Promise<DomainResponseDto> {
    return this.domainService.setPrimary((req as any).user.sub, tenantId, domainId);
  }

  /**
   * Cloudflare API 토큰 + Zone ID를 검증한다.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @param dto - Cloudflare API 토큰 + Zone ID
   * @returns 검증 결과
   */
  @Post('validate-cloudflare')
  @ApiOperation({ summary: 'Cloudflare API 토큰 + Zone 검증' })
  @ApiResponse({ status: 201, type: ValidateCloudflareResponseDto })
  validateCloudflare(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Body() dto: ValidateCloudflareRequestDto,
  ): Promise<ValidateCloudflareResponseDto> {
    return this.domainService.validateCloudflare((req as any).user.sub, tenantId, dto);
  }

  /**
   * DNS 검증 수행.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @param domainId - 도메인 ID
   * @returns 검증된 도메인 정보
   */
  @Post(':domainId/verify-dns')
  @ApiOperation({ summary: 'DNS 검증' })
  @ApiResponse({ status: 201, type: DomainResponseDto })
  verifyDns(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ): Promise<DomainResponseDto> {
    return this.domainService.verifyDns((req as any).user.sub, tenantId, domainId);
  }
}
