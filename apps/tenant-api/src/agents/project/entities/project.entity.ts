import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 프로젝트 엔티티.
 * ClickUp Space와 연동된 프로젝트 정보를 관리한다.
 */
@Entity('projects')
export class Project extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'status' })
  status: string;

  @Column({ name: 'category', nullable: true })
  category: string | null;

  @Column({ name: 'clickup_space_id', nullable: true })
  clickupSpaceId: string | null;

  @Column({ name: 'progress', type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'created_by' })
  createdBy: string;
}
