import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/**
 * 도메인 엔티티.
 * 테넌트에 연결되는 서브도메인 또는 커스텀 도메인.
 * 상태 변경은 비즈니스 메서드로만 가능 (setter 금지).
 */
@Entity('domains')
export class DomainEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'domain', length: 255, unique: true })
  domain: string;

  /** 공통코드 DOMAIN_TYPE: SUBDOMAIN, CUSTOM */
  @Column({ name: 'type', length: 50 })
  type: string;

  /** 공통코드 DNS_PROVIDER: CLOUDFLARE, ROUTE53, MANUAL */
  @Column({ name: 'dns_provider', length: 50, nullable: true })
  dnsProvider: string | null;

  /** 공통코드 DOMAIN_STATUS: PENDING, VERIFIED, ACTIVE, FAILED */
  @Column({ name: 'status', length: 50, default: 'PENDING' })
  status: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  /** CNAME 대상 (수동 DNS용) */
  @Column({ name: 'cname_target', length: 255, nullable: true })
  cnameTarget: string | null;

  /** 공통코드 SSL_STATUS */
  @Column({ name: 'ssl_status', length: 50, nullable: true })
  sslStatus: string | null;

  @Column({ name: 'dns_verified_at', type: 'timestamptz', nullable: true })
  dnsVerifiedAt: Date | null;

  @Column({ name: 'cloudflare_zone_id', length: 100, nullable: true })
  cloudflareZoneId: string | null;

  /** 암호화된 Cloudflare API 토큰 */
  @Column({ name: 'cloudflare_api_token_enc', length: 500, nullable: true })
  cloudflareApiTokenEnc: string | null;

  /**
   * 서브도메인 생성 팩토리.
   *
   * @param tenantId - 테넌트 ID
   * @param subdomain - 서브도메인명 (slug)
   * @param baseDomain - 기본 도메인 (예: haruos.app)
   * @returns ACTIVE 상태의 서브도메인 엔티티
   */
  static createSubdomain(tenantId: string, subdomain: string, baseDomain: string): DomainEntity {
    const entity = new DomainEntity();
    entity.tenantId = tenantId;
    entity.domain = `${subdomain}.${baseDomain}`;
    entity.type = 'SUBDOMAIN';
    entity.dnsProvider = null;
    entity.status = 'ACTIVE';
    entity.isPrimary = true;
    entity.cnameTarget = null;
    entity.sslStatus = null;
    entity.dnsVerifiedAt = null;
    entity.cloudflareZoneId = null;
    entity.cloudflareApiTokenEnc = null;
    return entity;
  }

  /**
   * 커스텀 도메인 생성 팩토리.
   *
   * @param tenantId - 테넌트 ID
   * @param domain - 커스텀 도메인 (예: haru.company.com)
   * @param dnsProvider - DNS 제공자 (CLOUDFLARE, ROUTE53, MANUAL)
   * @param cloudflareZoneId - Cloudflare Zone ID (선택)
   * @param cloudflareApiTokenEnc - 암호화된 Cloudflare API 토큰 (선택)
   * @returns PENDING 상태의 커스텀 도메인 엔티티
   */
  static createCustom(
    tenantId: string,
    domain: string,
    dnsProvider: string,
    cloudflareZoneId?: string,
    cloudflareApiTokenEnc?: string,
  ): DomainEntity {
    const entity = new DomainEntity();
    entity.tenantId = tenantId;
    entity.domain = domain;
    entity.type = 'CUSTOM';
    entity.dnsProvider = dnsProvider;
    entity.status = 'PENDING';
    entity.isPrimary = false;
    entity.cnameTarget = null;
    entity.sslStatus = null;
    entity.dnsVerifiedAt = null;
    entity.cloudflareZoneId = cloudflareZoneId || null;
    entity.cloudflareApiTokenEnc = cloudflareApiTokenEnc || null;
    return entity;
  }

  /**
   * PENDING -> VERIFIED 상태 전이. DNS 검증 완료 시 호출.
   *
   * @throws InvalidStateTransitionException PENDING 상태가 아닌 경우
   */
  verify(): void {
    if (this.status !== 'PENDING') {
      throw new InvalidStateTransitionException(this.status, 'VERIFIED');
    }
    this.status = 'VERIFIED';
    this.dnsVerifiedAt = new Date();
  }

  /**
   * VERIFIED -> ACTIVE 상태 전이. 도메인 활성화 시 호출.
   *
   * @throws InvalidStateTransitionException VERIFIED 상태가 아닌 경우
   */
  activate(): void {
    if (this.status !== 'VERIFIED') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
  }

  /**
   * 도메인 실패 처리. 어떤 상태에서든 FAILED로 전이 가능.
   */
  fail(): void {
    this.status = 'FAILED';
  }
}
