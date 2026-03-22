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

  /**
   * 동기화 성공 상태로 전이하고, 동기화 시각을 갱신한다.
   *
   * @param name - 동기화된 Space 이름
   */
  markSynced(name: string): void {
    this.name = name;
    this.lastSyncAt = new Date();
    this.status = 'SYNCED';
  }

  /**
   * 동기화 실패 상태로 전이한다.
   */
  markFailed(): void {
    this.status = 'FAILED';
  }
}
