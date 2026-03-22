import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * OTP 엔티티.
 * 이메일로 발송된 인증 코드를 저장한다.
 */
@Entity('otps')
export class OtpEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  /**
   * OTP가 만료되었는지 확인한다.
   */
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /**
   * OTP를 사용 처리한다.
   *
   * @throws Error 이미 사용되었거나 만료된 경우
   */
  markUsed(): void {
    if (this.isUsed) {
      throw new Error('OTP already used');
    }
    if (this.isExpired()) {
      throw new Error('OTP expired');
    }
    this.isUsed = true;
  }
}
