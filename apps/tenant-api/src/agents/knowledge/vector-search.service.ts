import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentChunk } from './entities/document-chunk.entity';

/** 벡터 검색 결과 항목. */
export interface VectorSearchResult {
  chunk: DocumentChunk;
  score: number;
}

/**
 * 벡터 검색 서비스.
 * pgvector 코사인 유사도 검색과 키워드 병합(하이브리드) 검색을 제공한다.
 * pgvector 미설치 환경에서는 LIKE fallback으로 동작한다.
 */
@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,
  ) {}

  /**
   * 코사인 유사도 기반 시맨틱 검색.
   * pgvector가 설치된 환경에서 embedding <=> 연산자를 사용한다.
   * 실패 시 빈 배열을 반환한다.
   *
   * @param queryEmbedding - 검색 쿼리의 임베딩 벡터
   * @param limit - 최대 결과 수
   * @returns 유사도 순으로 정렬된 검색 결과
   */
  async semanticSearch(queryEmbedding: number[], limit: number): Promise<VectorSearchResult[]> {
    try {
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      const rows: Array<{
        id: string;
        document_id: string;
        chunk_index: number;
        content: string;
        token_count: number;
        embedding: number[] | null;
        created_at: Date;
        updated_at: Date;
        score: number;
      }> = await this.chunkRepository.query(
        `SELECT *, 1 - (embedding::vector <=> $1::vector) AS score
         FROM document_chunks
         WHERE embedding IS NOT NULL
         ORDER BY embedding::vector <=> $1::vector
         LIMIT $2`,
        [embeddingStr, limit],
      );

      return rows.map((row) => ({
        chunk: this.mapRowToChunk(row),
        score: Number(row.score),
      }));
    } catch (error) {
      this.logger.warn(`시맨틱 검색 실패 (pgvector 미설치 가능): ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * 벡터 + 키워드 하이브리드 검색.
   * 시맨틱 검색 결과와 ILIKE 키워드 검색 결과를 병합하고 점수를 정규화한다.
   * 벡터 검색 비중 0.7, 키워드 검색 비중 0.3.
   *
   * @param query - 검색 쿼리 텍스트
   * @param queryEmbedding - 검색 쿼리의 임베딩 벡터
   * @param limit - 최대 결과 수
   * @returns 정규화된 점수 순으로 정렬된 검색 결과
   */
  async hybridSearch(
    query: string,
    queryEmbedding: number[],
    limit: number,
  ): Promise<VectorSearchResult[]> {
    const [vectorResults, keywordResults] = await Promise.all([
      this.semanticSearch(queryEmbedding, limit),
      this.keywordSearch(query, limit),
    ]);

    // 점수 병합: 벡터 0.7 + 키워드 0.3
    const scoreMap = new Map<string, { chunk: DocumentChunk; score: number }>();

    for (const result of vectorResults) {
      scoreMap.set(result.chunk.id, {
        chunk: result.chunk,
        score: result.score * 0.7,
      });
    }

    for (const result of keywordResults) {
      const existing = scoreMap.get(result.chunk.id);
      if (existing) {
        existing.score += result.score * 0.3;
      } else {
        scoreMap.set(result.chunk.id, {
          chunk: result.chunk,
          score: result.score * 0.3,
        });
      }
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * ILIKE 키워드 검색. pgvector 미설치 환경의 fallback으로도 사용된다.
   *
   * @param query - 검색 쿼리
   * @param limit - 최대 결과 수
   * @returns 키워드 매칭 결과 (고정 점수 0.5)
   */
  async keywordSearch(query: string, limit: number): Promise<VectorSearchResult[]> {
    const chunks = await this.chunkRepository
      .createQueryBuilder('chunk')
      .where('chunk.content ILIKE :query', { query: `%${query}%` })
      .orderBy('chunk.chunkIndex', 'ASC')
      .take(limit)
      .getMany();

    return chunks.map((chunk) => ({ chunk, score: 0.5 }));
  }

  /** raw query 결과 row를 DocumentChunk 엔티티로 매핑한다. */
  private mapRowToChunk(row: {
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    token_count: number;
    embedding: number[] | null;
    created_at: Date;
    updated_at: Date;
  }): DocumentChunk {
    const chunk = new DocumentChunk();
    chunk.id = row.id;
    chunk.documentId = row.document_id;
    chunk.chunkIndex = row.chunk_index;
    chunk.content = row.content;
    chunk.tokenCount = row.token_count;
    chunk.embedding = row.embedding;
    chunk.createdAt = row.created_at;
    chunk.updatedAt = row.updated_at;
    return chunk;
  }
}
