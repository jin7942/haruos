import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * ClickUp Space와의 프로젝트 동기화 상태를 추적하는 엔티티.
 * 마지막 동기화 시점, 동기화 성공/실패 상태를 관리한다.
 */
@Entity('project_syncs')
export class ProjectSyncEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'clickup_space_id' })
  clickupSpaceId: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt: Date | null;

  @Column({ name: 'status', default: 'SYNCED' })
  status: string;
}
