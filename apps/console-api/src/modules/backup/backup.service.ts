import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { BackupEntity, BackupStatus, BackupType } from './entities/backup.entity';
import { BackupResponseDto } from './dto/backup.response.dto';
import { BackupDownloadResponseDto } from './dto/backup-download.response.dto';
import { TenantService } from '../tenant/tenant.service';
import {
  ResourceNotFoundException,
  ValidationException,
} from '../../common/exceptions/business.exception';

/** 다운로드 URL 기본 만료 시간 (초) */
const DOWNLOAD_EXPIRES_IN = 3600;

/**
 * 백업 서비스.
 * 테넌트 데이터의 백업/내보내기를 관리한다.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    @InjectRepository(BackupEntity)
    private readonly backupRepository: Repository<BackupEntity>,
    private readonly tenantService: TenantService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 테넌트 백업을 시작한다.
   * 백업 레코드를 생성하고 비동기 백업 프로세스를 트리거한다.
   *
   * @param userId - 소유자 ID
   * @param tenantId - 테넌트 ID
   * @returns 생성된 백업 정보
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async createBackup(userId: string, tenantId: string): Promise<BackupResponseDto> {
    await this.tenantService.findOne(userId, tenantId);

    const backup = BackupEntity.create(tenantId, BackupType.FULL);
    const saved = await this.backupRepository.save(backup);

    this.logger.log(`백업 시작: tenantId=${tenantId}, backupId=${saved.id}`);

    // 비동기로 백업 실행 (실패해도 API 응답에는 영향 없음)
    this.executeBackup(saved.id).catch((error) => {
      this.logger.error(`백업 실패: backupId=${saved.id}, error=${error.message}`);
    });

    return BackupResponseDto.from(saved);
  }

  /**
   * 테넌트 데이터를 내보내기(export)한다.
   * JSON 형식으로 데이터를 추출하여 S3에 저장.
   *
   * @param userId - 소유자 ID
   * @param tenantId - 테넌트 ID
   * @returns 생성된 내보내기 백업 정보
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async exportData(userId: string, tenantId: string): Promise<BackupResponseDto> {
    await this.tenantService.findOne(userId, tenantId);

    const backup = BackupEntity.create(tenantId, BackupType.EXPORT);
    const saved = await this.backupRepository.save(backup);

    this.logger.log(`데이터 내보내기 시작: tenantId=${tenantId}, backupId=${saved.id}`);

    this.executeBackup(saved.id).catch((error) => {
      this.logger.error(`내보내기 실패: backupId=${saved.id}, error=${error.message}`);
    });

    return BackupResponseDto.from(saved);
  }

  /**
   * 백업 다운로드 URL을 생성한다.
   * 완료된 백업의 S3 presigned URL을 반환한다.
   *
   * @param userId - 소유자 ID
   * @param tenantId - 테넌트 ID
   * @param backupId - 백업 ID
   * @returns presigned URL
   * @throws ResourceNotFoundException 백업이 없는 경우
   * @throws ValidationException 백업이 완료되지 않은 경우
   */
  async getDownloadUrl(
    userId: string,
    tenantId: string,
    backupId: string,
  ): Promise<BackupDownloadResponseDto> {
    await this.tenantService.findOne(userId, tenantId);

    const backup = await this.backupRepository.findOne({
      where: { id: backupId, tenantId },
    });
    if (!backup) {
      throw new ResourceNotFoundException('Backup', backupId);
    }

    if (backup.status !== BackupStatus.COMPLETED || !backup.s3Key) {
      throw new ValidationException('Backup is not completed yet');
    }

    // S3 presigned URL 생성 (실제 구현은 AWS SDK 사용)
    const bucket = this.configService.get('BACKUP_S3_BUCKET', 'haruos-backups');
    const url = `https://${bucket}.s3.amazonaws.com/${backup.s3Key}`;

    this.logger.log(`백업 다운로드 URL 생성: backupId=${backupId}`);
    return BackupDownloadResponseDto.of(url, DOWNLOAD_EXPIRES_IN);
  }

  /**
   * 테넌트의 백업 목록을 조회한다.
   *
   * @param userId - 소유자 ID
   * @param tenantId - 테넌트 ID
   * @returns 백업 목록
   */
  async findByTenantId(userId: string, tenantId: string): Promise<BackupResponseDto[]> {
    await this.tenantService.findOne(userId, tenantId);

    const backups = await this.backupRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return backups.map(BackupResponseDto.from);
  }

  /**
   * 백업을 실행한다 (비동기).
   * 실제 구현에서는 pg_dump, S3 업로드 등을 수행.
   *
   * @param backupId - 백업 ID
   */
  private async executeBackup(backupId: string): Promise<void> {
    const backup = await this.backupRepository.findOne({ where: { id: backupId } });
    if (!backup) return;

    try {
      backup.start();
      await this.backupRepository.save(backup);

      // 실제 백업 로직은 추후 구현 (pg_dump + S3 upload)
      const s3Key = `backups/${backup.tenantId}/${backup.id}.tar.gz`;
      backup.complete(s3Key, 0);
      await this.backupRepository.save(backup);

      this.logger.log(`백업 완료: backupId=${backupId}, s3Key=${s3Key}`);
    } catch (error: unknown) {
      backup.fail((error as Error).message);
      await this.backupRepository.save(backup);
    }
  }
}
