import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/**
 * 테넌트(프로젝트) 엔티티.
 * 상태 변경은 비즈니스 메서드로만 가능 (setter 금지).
 */
@Entity('tenants')
export class TenantEntity extends SoftDeletableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'name', length: 100 })
  name: string;

  @Column({ name: 'slug', length: 100, unique: true })
  slug: string;

  @Column({ name: 'description', length: 500, nullable: true })
  description: string | null;

  @Column({ name: 'status', length: 50, default: 'CREATING' })
  status: string;

  @Column({ name: 'plan', length: 50, default: 'STARTER' })
  plan: string;

  @Column({ name: 'region', length: 50 })
  region: string;

  @Column({ name: 'trial_ends_at', type: 'timestamptz', nullable: true })
  trialEndsAt: Date | null;

  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  /**
   * 테넌트 생성 팩토리.
   *
   * @param userId - 소유자 ID
   * @param name - 테넌트 이름
   * @param slug - URL 슬러그
   * @param region - AWS 리전
   * @param description - 설명 (선택)
   */
  static create(
    userId: string,
    name: string,
    slug: string,
    region: string,
    description?: string,
  ): TenantEntity {
    const tenant = new TenantEntity();
    tenant.userId = userId;
    tenant.name = name;
    tenant.slug = slug;
    tenant.region = region;
    tenant.description = description || null;
    tenant.status = 'CREATING';
    tenant.plan = 'STARTER';
    tenant.trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    return tenant;
  }

  /**
   * CREATING -> ACTIVE 전이.
   * 프로비저닝 완료 시 호출.
   */
  activate(): void {
    if (this.status !== 'CREATING') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
  }

  /**
   * ACTIVE -> SUSPENDED 전이.
   *
   * @throws InvalidStateTransitionException ACTIVE 상태가 아닌 경우
   */
  suspend(): void {
    if (this.status !== 'ACTIVE') {
      throw new InvalidStateTransitionException(this.status, 'SUSPENDED');
    }
    this.status = 'SUSPENDED';
    this.suspendedAt = new Date();
  }

  /**
   * SUSPENDED -> ACTIVE 전이.
   *
   * @throws InvalidStateTransitionException SUSPENDED 상태가 아닌 경우
   */
  resume(): void {
    if (this.status !== 'SUSPENDED') {
      throw new InvalidStateTransitionException(this.status, 'ACTIVE');
    }
    this.status = 'ACTIVE';
    this.suspendedAt = null;
  }
}
