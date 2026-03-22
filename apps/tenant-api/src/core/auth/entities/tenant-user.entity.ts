import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 테넌트 사용자 엔티티.
 * 비밀번호 없이 OTP 기반 인증만 지원한다.
 */
@Entity('tenant_users')
export class TenantUserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  /**
   * 마지막 로그인 시각을 갱신한다.
   */
  recordLogin(): void {
    this.lastLoginAt = new Date();
  }

  /**
   * 사용자를 비활성화한다.
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * 사용자를 활성화한다.
   */
  activate(): void {
    this.isActive = true;
  }
}
