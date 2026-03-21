import { ApiProperty } from '@nestjs/swagger';
import { ProvisioningJobEntity } from '../entities/provisioning-job.entity';

/**
 * 프로비저닝 작업 응답 DTO.
 */
export class ProvisioningJobResponseDto {
  @ApiProperty({ description: '작업 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: '작업 상태 (PENDING, IN_PROGRESS, COMPLETED, FAILED, ROLLING_BACK, ROLLED_BACK)' })
  status: string;

  @ApiProperty({ description: '현재 진행 단계', nullable: true })
  currentStep: string | null;

  @ApiProperty({ description: '전체 단계 수' })
  totalSteps: number;

  @ApiProperty({ description: '완료된 단계 수' })
  completedSteps: number;

  @ApiProperty({ description: '시작 시각', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ description: '완료 시각', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ description: '에러 메시지', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ description: '생성 시각' })
  createdAt: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   */
  static from(entity: ProvisioningJobEntity): ProvisioningJobResponseDto {
    const dto = new ProvisioningJobResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.status = entity.status;
    dto.currentStep = entity.currentStep;
    dto.totalSteps = entity.totalSteps;
    dto.completedSteps = entity.completedSteps;
    dto.startedAt = entity.startedAt;
    dto.completedAt = entity.completedAt;
    dto.errorMessage = entity.errorMessage;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
