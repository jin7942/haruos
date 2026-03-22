import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * OTP 엔티티.
 * 사용자에게 발송된 인증 코드를 저장한다.
 */
@Entity('otp_codes')
export class OtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 6 })
  code: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /** OTP가 만료되었는지 확인한다. */
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  /**
   * OTP를 사용 처리한다.
   *
   * @throws Error 이미 사용되었거나 만료된 경우
   */
  markUsed(): void {
    if (this.usedAt) {
      throw new Error('OTP already used');
    }
    if (this.isExpired()) {
      throw new Error('OTP expired');
    }
    this.usedAt = new Date();
  }
}
