import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { DocumentChunk } from './entities/document-chunk.entity';
import { KnowledgeSearchResponseDto } from './dto/knowledge-search.response.dto';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/** 청크 분할 시 최대 문자 수 */
const CHUNK_MAX_LENGTH = 500;

/**
 * 지식 에이전트 서비스.
 * 문서를 청크로 분할하여 임베딩 인덱싱하고, 유사도 검색(RAG)을 수행한다.
 */
@Injectable()
export class KnowledgeAgentService {
  private readonly logger = new Logger(KnowledgeAgentService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,
    private readonly aiGatewayService: AiGatewayService,
  ) {}

  /**
   * 문서 내용을 청크로 분할하고 임베딩 벡터를 생성하여 저장한다.
   *
   * @param documentId - 인덱싱할 문서 ID
   * @param content - 문서 내용
   * @returns 생성된 DocumentChunk 목록
   */
  async indexDocument(documentId: string, content: string): Promise<DocumentChunk[]> {
    this.logger.log(`문서 인덱싱 시작: documentId=${documentId}`);

    // 기존 청크 삭제
    await this.deleteDocumentChunks(documentId);

    // 문서를 청크로 분할
    const chunks = this.splitIntoChunks(content);
    const savedChunks: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];

      let embedding: number[] | null = null;
      try {
        embedding = await this.aiGatewayService.generateEmbedding(chunkText);
      } catch (error) {
        this.logger.warn(`임베딩 생성 실패 (chunk ${i}), fallback to null: ${(error as Error).message}`);
      }

      const chunk = this.chunkRepository.create({
        documentId,
        chunkIndex: i,
        content: chunkText,
        tokenCount: Math.ceil(chunkText.length / 4),
        embedding,
      });

      savedChunks.push(await this.chunkRepository.save(chunk));
    }

    this.logger.log(`문서 인덱싱 완료: documentId=${documentId}, chunks=${savedChunks.length}`);
    return savedChunks;
  }

  /**
   * 쿼리와 유사한 문서 청크를 검색한다.
   * 현재는 pgvector 미설정 상태로 단순 LIKE 검색으로 대체.
   *
   * @param query - 검색 쿼리
   * @param limit - 최대 결과 수 (기본: 10)
   * @returns 유사도 순 검색 결과
   */
  async search(query: string, limit = 10): Promise<KnowledgeSearchResponseDto[]> {
    this.logger.log(`지식 검색: query="${query}", limit=${limit}`);

    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await this.aiGatewayService.generateEmbedding(query);
    } catch (error) {
      this.logger.warn(`쿼리 임베딩 생성 실패, LIKE fallback: ${(error as Error).message}`);
    }

    // 벡터 검색 가능하면 코사인 유사도 사용, 불가하면 LIKE fallback
    if (queryEmbedding) {
      try {
        const embeddingStr = `{${queryEmbedding.join(',')}}`;
        const results = await this.chunkRepository.query(
          `SELECT *, 1 - (embedding::vector <=> $1::vector) as score
           FROM document_chunks
           WHERE embedding IS NOT NULL
           ORDER BY score DESC
           LIMIT $2`,
          [embeddingStr, limit],
        );
        return results.map((row: { id: string; document_id: string; content: string; score: number }) => {
          const chunk = new DocumentChunk();
          chunk.id = row.id;
          chunk.documentId = row.document_id;
          chunk.content = row.content;
          return KnowledgeSearchResponseDto.from(chunk, Number(row.score));
        });
      } catch (error) {
        this.logger.warn(`벡터 검색 실패, LIKE fallback: ${(error as Error).message}`);
      }
    }

    // LIKE fallback
    const chunks = await this.chunkRepository.find({
      where: { content: Like(`%${query}%`) },
      take: limit,
      order: { chunkIndex: 'ASC' },
    });

    return chunks.map((chunk) => {
      const score = 0.5;
      return KnowledgeSearchResponseDto.from(chunk, score);
    });
  }

  /**
   * 특정 문서의 모든 청크를 삭제한다.
   *
   * @param documentId - 문서 ID
   */
  async deleteDocumentChunks(documentId: string): Promise<void> {
    await this.chunkRepository.delete({ documentId });
    this.logger.log(`문서 청크 삭제: documentId=${documentId}`);
  }

  /**
   * 텍스트를 일정 크기의 청크로 분할한다.
   * 단락(빈 줄) 기준으로 우선 분할하고, 초과 시 문자 수로 분할.
   */
  private splitIntoChunks(text: string): string[] {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > CHUNK_MAX_LENGTH && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += (currentChunk.length > 0 ? '\n\n' : '') + paragraph;
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    // 빈 결과 방지
    if (chunks.length === 0 && text.trim().length > 0) {
      chunks.push(text.trim());
    }

    return chunks;
  }
}
