import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../auth/entities/user.entity';

/** 관리자용 사용자 목록 항목. */
export class AdminUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ['USER', 'ADMIN'] })
  role: string;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty({ nullable: true })
  lastLoginAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  /** @param entity - UserEntity에서 변환 */
  static from(entity: UserEntity): AdminUserResponseDto {
    const dto = new AdminUserResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.name = entity.name;
    dto.role = entity.role;
    dto.isEmailVerified = entity.isEmailVerified;
    dto.lastLoginAt = entity.lastLoginAt;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
