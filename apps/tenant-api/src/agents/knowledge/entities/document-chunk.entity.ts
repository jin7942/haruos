import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * 문서 청크 엔티티.
 * RAG 검색을 위해 문서를 분할 저장한다. pgvector 임베딩 벡터를 포함.
 */
@Entity('document_chunks')
export class DocumentChunk extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number;

  @Column({ name: 'content', type: 'text' })
  content: string;

  /**
   * pgvector 컬럼. TypeORM에서 직접 지원하지 않으므로 string으로 매핑.
   * 저장/조회 시 `[0.1, 0.2, ...]` 형식의 문자열로 변환된다.
   * 벡터 검색은 raw query로 수행.
   */
  @Column({ name: 'embedding', type: 'text', nullable: true })
  embedding: string | null;

  @Column({ name: 'token_count', type: 'int', default: 0 })
  tokenCount: number;
}
