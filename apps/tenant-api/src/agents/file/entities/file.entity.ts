import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/** 파일 상태 상수. 공통코드 UPLOAD_STATUS 그룹과 대응. */
const FileStatus = {
  UPLOADED: 'UPLOADED',
  EXTRACTED: 'EXTRACTED',
  FAILED: 'FAILED',
} as const;

/**
 * 파일 엔티티.
 * S3에 저장된 파일의 메타데이터를 관리한다.
 */
@Entity('files')
export class File extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 's3_key' })
  s3Key: string;

  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string; // bigint은 string으로 반환됨

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'category', type: 'varchar', nullable: true })
  category: string | null;

  @Column({ name: 'status', default: FileStatus.UPLOADED })
  status: string;

  @Column({ name: 'project_id', type: 'varchar', nullable: true })
  projectId: string | null;

  @Column({ name: 'parent_file_id', type: 'varchar', nullable: true })
  parentFileId: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy: string | null;

  /** 파일 압축 해제 완료 처리. UPLOADED 상태에서만 전이 가능. */
  markExtracted(): void {
    if (this.status !== FileStatus.UPLOADED) {
      throw new InvalidStateTransitionException(this.status, FileStatus.EXTRACTED);
    }
    this.status = FileStatus.EXTRACTED;
  }

  /** 파일 처리 실패 처리. */
  markFailed(): void {
    if (this.status === FileStatus.FAILED) {
      throw new InvalidStateTransitionException(this.status, FileStatus.FAILED);
    }
    this.status = FileStatus.FAILED;
  }
}
