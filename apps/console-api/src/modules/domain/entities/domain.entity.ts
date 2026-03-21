import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

@Entity('domains')
export class DomainEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'domain' })
  domain: string;

  @Column({ name: 'type' })
  type: string;

  @Column({ name: 'dns_provider' })
  dnsProvider: string;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'is_primary', default: false })
  isPrimary: boolean;

  @Column({ name: 'cname_target', nullable: true })
  cnameTarget: string | null;

  @Column({ name: 'ssl_status', nullable: true })
  sslStatus: string | null;

  /** DNS 검증 완료 */
  verify(): void {
    if (this.status !== 'PENDING') {
      throw new InvalidStateTransitionException(this.status, 'VERIFIED');
    }
    this.status = 'VERIFIED';
  }

  /** 도메인 활성화 */
  activate(): void {
    if (this.status !== 'VERIFIED') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
  }

  /** 도메인 실패 처리 */
  fail(): void {
    this.status = 'FAILED';
  }
}
