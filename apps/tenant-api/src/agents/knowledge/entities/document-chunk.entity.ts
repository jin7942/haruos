import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 문서 청크 엔티티.
 * RAG 검색을 위해 문서를 분할 저장한다. pgvector 임베딩 벡터를 포함 예정.
 */
@Entity('document_chunks')
export class DocumentChunk extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'token_count', type: 'int' })
  tokenCount: number;

  // TODO(2026-03-21): pgvector 설정 후 활성화
  // @Column({ name: 'embedding', type: 'vector', nullable: true })
  // embedding: number[] | null;
}
