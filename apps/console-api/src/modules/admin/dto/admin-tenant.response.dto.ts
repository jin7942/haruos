import { ApiProperty } from '@nestjs/swagger';
import { TenantEntity } from '../../tenant/entities/tenant.entity';

/** 관리자용 테넌트 목록 항목. 소유자 정보를 포함. */
export class AdminTenantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  plan: string;

  @ApiProperty()
  region: string;

  @ApiProperty()
  trialEndsAt: Date | null;

  @ApiProperty()
  suspendedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  /** @param entity - TenantEntity에서 변환 */
  static from(entity: TenantEntity): AdminTenantResponseDto {
    const dto = new AdminTenantResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.plan = entity.plan;
    dto.region = entity.region;
    dto.trialEndsAt = entity.trialEndsAt;
    dto.suspendedAt = entity.suspendedAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
