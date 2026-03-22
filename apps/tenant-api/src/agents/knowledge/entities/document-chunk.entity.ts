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
   * 임베딩 벡터. float8 배열로 저장하여 pgvector 캐스팅(::vector)이 가능하다.
   * pgvector 미설치 환경에서도 float8[]로 저장/조회할 수 있다.
   */
  @Column({ name: 'embedding', type: 'float8', array: true, nullable: true })
  embedding: number[] | null;

  @Column({ name: 'token_count', type: 'int', default: 0 })
  tokenCount: number;
}
