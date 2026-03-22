import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

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

  @Column({ name: 'category', nullable: true })
  category: string | null;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ name: 'parent_file_id', nullable: true })
  parentFileId: string | null;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;
}
