import { ApiProperty } from '@nestjs/swagger';

/** 관리자 대시보드 통계 응답. */
export class AdminDashboardResponseDto {
  @ApiProperty({ description: '전체 테넌트 수' })
  totalTenants: number;

  @ApiProperty({ description: '활성 테넌트 수' })
  activeTenants: number;

  @ApiProperty({ description: '트라이얼 테넌트 수' })
  trialTenants: number;

  @ApiProperty({ description: '일시 중지 테넌트 수' })
  suspendedTenants: number;

  @ApiProperty({ description: '전체 사용자 수' })
  totalUsers: number;

  @ApiProperty({ description: '인증 완료 사용자 수' })
  verifiedUsers: number;

  @ApiProperty({ description: '활성 구독 수' })
  activeSubscriptions: number;

  static of(params: {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    verifiedUsers: number;
    activeSubscriptions: number;
  }): AdminDashboardResponseDto {
    const dto = new AdminDashboardResponseDto();
    Object.assign(dto, params);
    return dto;
  }
}
