import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainEntity } from '../entities/domain.entity';

/**
 * 도메인 응답 DTO.
 */
export class DomainResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  domain: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  dnsProvider: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  isPrimary: boolean;

  @ApiPropertyOptional()
  cnameTarget: string | null;

  @ApiPropertyOptional()
  sslStatus: string | null;

  @ApiPropertyOptional()
  dnsVerifiedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   *
   * @param entity - 도메인 엔티티
   * @returns 도메인 응답 DTO
   */
  static from(entity: DomainEntity): DomainResponseDto {
    const dto = new DomainResponseDto();
    dto.id = entity.id;
    dto.tenantId = entity.tenantId;
    dto.domain = entity.domain;
    dto.type = entity.type;
    dto.dnsProvider = entity.dnsProvider;
    dto.status = entity.status;
    dto.isPrimary = entity.isPrimary;
    dto.cnameTarget = entity.cnameTarget;
    dto.sslStatus = entity.sslStatus;
    dto.dnsVerifiedAt = entity.dnsVerifiedAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
