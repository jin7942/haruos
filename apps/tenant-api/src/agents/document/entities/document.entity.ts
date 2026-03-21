import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('documents')
export class Document extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'content', type: 'text', nullable: true })
  content: string | null;

  @Column({ name: 'summary', type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'type' })
  type: string;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ name: 's3_key', nullable: true })
  s3Key: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;
}
