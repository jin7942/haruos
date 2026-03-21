import { ApiProperty } from '@nestjs/swagger';
import { TenantEntity } from '../entities/tenant.entity';

export class TenantResponseDto {
  @ApiProperty()
  id: string;

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
  createdAt: Date;

  /**
   * 엔티티에서 응답 DTO로 변환.
   */
  static from(entity: TenantEntity): TenantResponseDto {
    const dto = new TenantResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.slug = entity.slug;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.plan = entity.plan;
    dto.region = entity.region;
    dto.trialEndsAt = entity.trialEndsAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
