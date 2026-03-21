import { ApiProperty } from '@nestjs/swagger';
import { ProvisioningLogEntity } from '../entities/provisioning-log.entity';

/**
 * 프로비저닝 로그 응답 DTO.
 */
export class ProvisioningLogResponseDto {
  @ApiProperty({ description: '로그 ID' })
  id: string;

  @ApiProperty({ description: '작업 ID' })
  jobId: string;

  @ApiProperty({ description: '단계명' })
  step: string;

  @ApiProperty({ description: '단계 상태' })
  status: string;

  @ApiProperty({ description: '로그 메시지', nullable: true })
  message: string | null;

  @ApiProperty({ description: '상세 출력 (Terraform/Ansible)', nullable: true })
  detail: Record<string, unknown> | null;

  @ApiProperty({ description: '시작 시각', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ description: '완료 시각', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ description: '생성 시각' })
  createdAt: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   */
  static from(entity: ProvisioningLogEntity): ProvisioningLogResponseDto {
    const dto = new ProvisioningLogResponseDto();
    dto.id = entity.id;
    dto.jobId = entity.jobId;
    dto.step = entity.step;
    dto.status = entity.status;
    dto.message = entity.message;
    dto.detail = entity.detail;
    dto.startedAt = entity.startedAt;
    dto.completedAt = entity.completedAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
