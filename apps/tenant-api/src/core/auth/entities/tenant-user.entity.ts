import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 테넌트 사용자 엔티티.
 * 테넌트별 독립 RDS에 저장되므로 tenant_id 불필요.
 * OTP 기반 인증만 지원한다.
 */
@Entity('users')
export class TenantUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, default: 'MEMBER' })
  role: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /** 마지막 로그인 시각을 갱신한다. */
  recordLogin(): void {
    this.lastLoginAt = new Date();
  }

  /** 사용자를 비활성화한다. */
  deactivate(): void {
    this.isActive = false;
  }

  /** 사용자를 활성화한다. */
  activate(): void {
    this.isActive = true;
  }
}
