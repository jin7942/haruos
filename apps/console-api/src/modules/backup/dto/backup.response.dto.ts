import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BackupEntity } from '../entities/backup.entity';

/** 백업 응답 DTO. */
export class BackupResponseDto {
  @ApiProperty({ description: '백업 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: '백업 타입', enum: ['FULL', 'EXPORT'] })
  type: string;

  @ApiProperty({ description: '백업 상태', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'] })
  status: string;

  @ApiPropertyOptional({ description: '파일 크기 (bytes)' })
  sizeBytes: number | null;

  @ApiPropertyOptional({ description: '에러 메시지' })
  errorMessage: string | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: string;

  @ApiPropertyOptional({ description: '완료일시' })
  completedAt: string | null;

  /**
   * BackupEntity에서 DTO로 변환한다.
   *
   * @param entity - BackupEntity
   */
  static from(entity: BackupEntity): BackupResponseDto {
    const dto = new BackupResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.type = entity.type;
    dto.status = entity.status;
    dto.sizeBytes = entity.sizeBytes;
    dto.errorMessage = entity.errorMessage;
    dto.createdAt = entity.createdAt.toISOString();
    dto.completedAt = entity.completedAt?.toISOString() ?? null;
    return dto;
  }
}
