import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BackupService } from './backup.service';
import { BackupResponseDto } from './dto/backup.response.dto';
import { BackupDownloadResponseDto } from './dto/backup-download.response.dto';

/**
 * 백업 컨트롤러.
 * 테넌트 데이터의 백업/내보내기/다운로드 API를 제공한다.
 */
@ApiTags('Backup')
@ApiBearerAuth()
@Controller('tenants/:tenantId/backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * 테넌트 백업을 시작한다.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @returns 생성된 백업 정보
   */
  @Post()
  @ApiOperation({ summary: '테넌트 백업 시작' })
  @ApiResponse({ status: 201, type: BackupResponseDto })
  createBackup(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<BackupResponseDto> {
    return this.backupService.createBackup((req as any).user.sub, tenantId);
  }

  /**
   * 테넌트 백업 목록을 조회한다.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @returns 백업 목록
   */
  @Get()
  @ApiOperation({ summary: '백업 목록 조회' })
  @ApiResponse({ status: 200, type: [BackupResponseDto] })
  findAll(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<BackupResponseDto[]> {
    return this.backupService.findByTenantId((req as any).user.sub, tenantId);
  }

  /**
   * 백업 다운로드 URL을 생성한다.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @param backupId - 백업 ID
   * @returns 다운로드 URL
   */
  @Get(':backupId/download')
  @ApiOperation({ summary: '백업 다운로드 URL 조회' })
  @ApiResponse({ status: 200, type: BackupDownloadResponseDto })
  getDownloadUrl(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Param('backupId') backupId: string,
  ): Promise<BackupDownloadResponseDto> {
    return this.backupService.getDownloadUrl((req as any).user.sub, tenantId, backupId);
  }

  /**
   * 테넌트 데이터를 내보내기(export)한다.
   *
   * @param req - HTTP 요청 (JWT 포함)
   * @param tenantId - 테넌트 ID
   * @returns 내보내기 백업 정보
   */
  @Post('export')
  @ApiOperation({ summary: '테넌트 데이터 내보내기' })
  @ApiResponse({ status: 201, type: BackupResponseDto })
  exportData(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
  ): Promise<BackupResponseDto> {
    return this.backupService.exportData((req as any).user.sub, tenantId);
  }
}
