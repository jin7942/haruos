import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 격리 수준 상수.
 * SHARED: 공유 보안그룹 (기본, 비용 절감)
 * DEDICATED: 테넌트 전용 보안그룹 + S3 prefix 격리
 */
export const ISOLATION_LEVEL = {
  SHARED: 'SHARED',
  DEDICATED: 'DEDICATED',
} as const;

export type IsolationLevel = (typeof ISOLATION_LEVEL)[keyof typeof ISOLATION_LEVEL];

/**
 * 테넌트 격리 수준 관리 서비스.
 * 보안그룹 격리, S3 prefix 격리, 네트워크 격리 정책을 결정한다.
 */
@Injectable()
export class TenantIsolationService {
  private readonly logger = new Logger(TenantIsolationService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 테넌트의 S3 오브젝트 키 prefix를 반환한다.
   * 모든 테넌트 파일은 이 prefix 하위에 저장되어야 한다.
   *
   * @param tenantId - 테넌트 ID
   * @returns S3 prefix (예: "tenants/{tenantId}/")
   */
  getS3Prefix(tenantId: string): string {
    return `tenants/${tenantId}/`;
  }

  /**
   * 테넌트의 S3 전체 키를 생성한다.
   * prefix를 자동으로 붙여 다른 테넌트 경로 접근을 방지한다.
   *
   * @param tenantId - 테넌트 ID
   * @param objectKey - 오브젝트 키 (파일명 또는 경로)
   * @returns prefix가 포함된 전체 S3 키
   */
  buildS3Key(tenantId: string, objectKey: string): string {
    const sanitized = objectKey.replace(/^\/+/, '');
    return `${this.getS3Prefix(tenantId)}${sanitized}`;
  }

  /**
   * S3 키가 해당 테넌트 prefix에 속하는지 검증한다.
   *
   * @param tenantId - 테넌트 ID
   * @param s3Key - 검증할 S3 키
   * @returns 해당 테넌트 prefix에 속하면 true
   */
  validateS3KeyOwnership(tenantId: string, s3Key: string): boolean {
    return s3Key.startsWith(this.getS3Prefix(tenantId));
  }

  /**
   * 테넌트의 격리 수준을 결정한다.
   * 환경변수 또는 플랜에 따라 격리 수준이 달라진다.
   *
   * @param plan - 테넌트 플랜 (STARTER 등)
   * @returns 격리 수준
   */
  getIsolationLevel(plan: string): IsolationLevel {
    const defaultLevel = this.configService.get<string>('TENANT_ISOLATION_LEVEL', ISOLATION_LEVEL.DEDICATED);
    if (defaultLevel === ISOLATION_LEVEL.SHARED) {
      return ISOLATION_LEVEL.SHARED;
    }
    return ISOLATION_LEVEL.DEDICATED;
  }

  /**
   * 테넌트 전용 보안그룹이 필요한지 판단한다.
   *
   * @param plan - 테넌트 플랜
   * @returns 전용 보안그룹 필요 여부
   */
  requiresDedicatedSecurityGroup(plan: string): boolean {
    return this.getIsolationLevel(plan) === ISOLATION_LEVEL.DEDICATED;
  }
}
