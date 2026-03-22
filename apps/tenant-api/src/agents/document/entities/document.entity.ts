import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InvalidStateTransitionException } from '../../../common/exceptions/business.exception';

/** 문서 타입 */
export const DocumentType = {
  GENERAL: 'GENERAL',
  MEETING_NOTE: 'MEETING_NOTE',
  SUMMARY: 'SUMMARY',
  ACTION_ITEM: 'ACTION_ITEM',
} as const;

/** 문서 상태 */
export const DocumentStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

/**
 * 문서 엔티티.
 * 회의록, 요약, Action Item 등의 문서를 관리한다.
 *
 * 상태 전이:
 * - DRAFT -> PUBLISHED
 * - PUBLISHED -> ARCHIVED
 */
@Entity('documents')
@Index(['type'])
@Index(['createdBy'])
export class Document extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ name: 'type', length: 50, default: 'GENERAL' })
  type: string;

  @Column({ name: 'status', length: 50, default: 'DRAFT' })
  status: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ name: 's3_key', type: 'varchar', length: 500, nullable: true })
  s3Key: string | null;

  @Column({ name: 'word_count', type: 'int', default: 0 })
  wordCount: number;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  /**
   * 문서를 발행한다.
   *
   * @throws InvalidStateTransitionException DRAFT가 아닌 상태에서 발행 시도 시
   */
  publish(): void {
    if (this.status !== DocumentStatus.DRAFT) {
      throw new InvalidStateTransitionException(this.status, DocumentStatus.PUBLISHED);
    }
    this.status = DocumentStatus.PUBLISHED;
  }

  /**
   * 문서를 보관 처리한다.
   *
   * @throws InvalidStateTransitionException PUBLISHED가 아닌 상태에서 보관 시도 시
   */
  archive(): void {
    if (this.status !== DocumentStatus.PUBLISHED) {
      throw new InvalidStateTransitionException(this.status, DocumentStatus.ARCHIVED);
    }
    this.status = DocumentStatus.ARCHIVED;
  }
}
