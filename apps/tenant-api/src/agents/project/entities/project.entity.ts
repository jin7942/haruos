import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/** 프로젝트 상태 상수. 공통코드 PROJECT_STATUS 그룹과 대응. */
const ProjectStatus = {
  ACTIVE: 'ACTIVE',
  SYNCED: 'SYNCED',
  ARCHIVED: 'ARCHIVED',
} as const;

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

  @Column({ name: 'status', default: ProjectStatus.ACTIVE })
  status: string;

  @Column({ name: 'category', type: 'varchar', nullable: true })
  category: string | null;

  @Column({ name: 'clickup_space_id', type: 'varchar', nullable: true })
  clickupSpaceId: string | null;

  @Column({ name: 'progress', type: 'int', default: 0 })
  progress: number;

  @Column({ name: 'created_by' })
  createdBy: string;

  /** 동기화 완료 처리. */
  markSynced(): void {
    this.status = ProjectStatus.SYNCED;
  }

  /** 프로젝트 아카이브. ARCHIVED 상태에서 중복 전이 방지. */
  archive(): void {
    if (this.status === ProjectStatus.ARCHIVED) {
      throw new InvalidStateTransitionException(this.status, ProjectStatus.ARCHIVED);
    }
    this.status = ProjectStatus.ARCHIVED;
  }
}
