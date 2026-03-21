import { ApiProperty } from '@nestjs/swagger';
import { AlertConfigEntity } from '../entities/alert-config.entity';

/**
 * 알림 설정 응답 DTO.
 */
export class AlertConfigResponseDto {
  @ApiProperty({ description: '알림 설정 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: '알림 유형 (COST, CPU, DB_STORAGE, AI_TOKEN)' })
  alertType: string;

  @ApiProperty({ description: '임계값' })
  threshold: number;

  @ApiProperty({ description: '활성화 여부' })
  isEnabled: boolean;

  @ApiProperty({ description: '마지막 알림 발생 시각', nullable: true })
  lastTriggeredAt: Date | null;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   */
  static from(entity: AlertConfigEntity): AlertConfigResponseDto {
    const dto = new AlertConfigResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.alertType = entity.alertType;
    dto.threshold = Number(entity.threshold);
    dto.isEnabled = entity.isEnabled;
    dto.lastTriggeredAt = entity.lastTriggeredAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
