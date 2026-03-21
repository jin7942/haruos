import { ApiProperty } from '@nestjs/swagger';
import { AwsCredentialEntity } from '../entities/aws-credential.entity';

/**
 * AWS 자격증명 응답 DTO.
 */
export class AwsCredentialResponseDto {
  @ApiProperty({ description: '자격증명 ID' })
  id: string;

  @ApiProperty({ description: '테넌트 ID' })
  tenantId: string;

  @ApiProperty({ description: 'IAM Role ARN' })
  roleArn: string;

  @ApiProperty({ description: 'AWS 리전' })
  region: string;

  @ApiProperty({ description: '검증 상태 (PENDING / VALIDATED / INVALID)' })
  status: string;

  @ApiProperty({ description: '검증 완료 시각', nullable: true })
  validatedAt: Date | null;

  @ApiProperty({ description: '생성 시각' })
  createdAt: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   *
   * @param entity - AwsCredentialEntity
   * @returns AwsCredentialResponseDto
   */
  static from(entity: AwsCredentialEntity): AwsCredentialResponseDto {
    const dto = new AwsCredentialResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.roleArn = entity.roleArn;
    dto.region = entity.region;
    dto.status = entity.status;
    dto.validatedAt = entity.validatedAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
