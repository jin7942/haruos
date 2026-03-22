import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 파일 업로드 기록 엔티티.
 * S3에 업로드된 파일의 메타데이터를 관리한다.
 */
@Entity('file_records')
export class FileRecordEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 's3_key' })
  s3Key: string;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'size', type: 'bigint' })
  size: string; // bigint는 string으로 반환됨

  @Column({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;
}
