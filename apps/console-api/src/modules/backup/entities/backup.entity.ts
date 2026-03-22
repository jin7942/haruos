import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/** 백업 상태 */
export const BackupStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

/** 백업 타입 */
export const BackupType = {
  FULL: 'FULL',
  EXPORT: 'EXPORT',
} as const;

/**
 * 테넌트 백업 엔티티.
 * 테넌트 데이터의 백업 이력을 관리한다.
 *
 * 상태 전이:
 * - PENDING -> IN_PROGRESS
 * - IN_PROGRESS -> COMPLETED | FAILED
 */
@Entity('backups')
@Index(['tenantId'])
@Index(['status'])
export class BackupEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'type', length: 50, default: 'FULL' })
  type: string;

  @Column({ name: 'status', length: 50, default: 'PENDING' })
  status: string;

  @Column({ name: 's3_key', type: 'varchar', length: 500, nullable: true })
  s3Key: string | null;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  /**
   * 백업 생성 팩토리.
   *
   * @param tenantId - 테넌트 ID
   * @param type - 백업 타입
   */
  static create(tenantId: string, type: string = BackupType.FULL): BackupEntity {
    const backup = new BackupEntity();
    backup.tenantId = tenantId;
    backup.type = type;
    backup.status = BackupStatus.PENDING;
    return backup;
  }

  /**
   * 백업 진행 시작.
   *
   * @throws InvalidStateTransitionException PENDING이 아닌 경우
   */
  start(): void {
    if (this.status !== BackupStatus.PENDING) {
      throw new InvalidStateTransitionException(this.status, BackupStatus.IN_PROGRESS);
    }
    this.status = BackupStatus.IN_PROGRESS;
  }

  /**
   * 백업 완료 처리.
   *
   * @param s3Key - S3 저장 경로
   * @param sizeBytes - 파일 크기
   * @throws InvalidStateTransitionException IN_PROGRESS가 아닌 경우
   */
  complete(s3Key: string, sizeBytes: number): void {
    if (this.status !== BackupStatus.IN_PROGRESS) {
      throw new InvalidStateTransitionException(this.status, BackupStatus.COMPLETED);
    }
    this.status = BackupStatus.COMPLETED;
    this.s3Key = s3Key;
    this.sizeBytes = sizeBytes;
    this.completedAt = new Date();
  }

  /**
   * 백업 실패 처리.
   *
   * @param errorMessage - 에러 메시지
   * @throws InvalidStateTransitionException IN_PROGRESS가 아닌 경우
   */
  fail(errorMessage: string): void {
    if (this.status !== BackupStatus.IN_PROGRESS) {
      throw new InvalidStateTransitionException(this.status, BackupStatus.FAILED);
    }
    this.status = BackupStatus.FAILED;
    this.errorMessage = errorMessage;
    this.completedAt = new Date();
  }
}
