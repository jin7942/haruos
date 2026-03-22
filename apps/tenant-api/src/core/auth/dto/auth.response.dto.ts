import { ApiProperty } from '@nestjs/swagger';
import { TenantUserEntity } from '../entities/tenant-user.entity';

/** 테넌트 사용자 요약 정보. 여러 응답 DTO에서 재사용. */
export class TenantUserSummaryVo {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  /** @param user - TenantUserEntity에서 변환 */
  static from(user: TenantUserEntity): TenantUserSummaryVo {
    const vo = new TenantUserSummaryVo();
    vo.id = user.id;
    vo.email = user.email;
    vo.name = user.name;
    vo.role = user.role;
    return vo;
  }
}

/** OTP 발송 응답. */
export class OtpResponseDto {
  @ApiProperty({ description: 'OTP 만료 시각 (ISO 8601)' })
  expiresAt: string;

  /** @param expiresAt - OTP 만료 시각 */
  static from(expiresAt: Date): OtpResponseDto {
    const dto = new OtpResponseDto();
    dto.expiresAt = expiresAt.toISOString();
    return dto;
  }
}

/** OTP 검증 성공 후 로그인 응답. Access Token + Refresh Token + 사용자 요약. */
export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ type: TenantUserSummaryVo })
  user: TenantUserSummaryVo;
}

/** 토큰 갱신 응답. 새 Access Token만 반환. */
export class TokenResponseDto {
  @ApiProperty()
  accessToken: string;
}
