import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentChunk } from './entities/document-chunk.entity';
import { KnowledgeSearchResponseDto } from './dto/knowledge-search.response.dto';
import { AskQuestionResponseDto, SourceChunkDto } from './dto/ask-question.response.dto';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { VectorSearchService } from './vector-search.service';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/** 청크 분할 시 최대 문자 수 */
const CHUNK_MAX_LENGTH = 500;

/** RAG 컨텍스트에 포함할 최대 청크 수 */
const RAG_CONTEXT_CHUNKS = 5;

/** RAG 시스템 프롬프트 */
const RAG_SYSTEM_PROMPT = `You are a helpful knowledge assistant. Answer the user's question based ONLY on the provided context. If the context doesn't contain enough information to answer, say so honestly. Always cite which document chunks you used. Respond in the same language as the question.`;

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
    private readonly vectorSearchService: VectorSearchService,
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

      const saved = await this.chunkRepository.save(chunk);
      savedChunks.push(saved);
    }

    this.logger.log(`문서 인덱싱 완료: documentId=${documentId}, chunks=${savedChunks.length}`);
    return savedChunks;
  }

  /**
   * 쿼리와 유사한 문서 청크를 검색한다.
   * 벡터 검색 가능 시 시맨틱 검색, 불가 시 키워드 fallback.
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
      this.logger.warn(`쿼리 임베딩 생성 실패, 키워드 fallback: ${(error as Error).message}`);
    }

    if (queryEmbedding) {
      const results = await this.vectorSearchService.semanticSearch(queryEmbedding, limit);
      if (results.length > 0) {
        return results.map((r) => KnowledgeSearchResponseDto.from(r.chunk, r.score));
      }
    }

    // 키워드 fallback
    const keywordResults = await this.vectorSearchService.keywordSearch(query, limit);
    return keywordResults.map((r) => KnowledgeSearchResponseDto.from(r.chunk, r.score));
  }

  /**
   * RAG 기반 질의응답.
   * 질문을 임베딩하여 관련 청크를 검색하고, 컨텍스트로 AI에게 질의한다.
   *
   * @param question - 사용자 질문
   * @returns AI 답변과 출처 청크 목록
   */
  async askQuestion(question: string): Promise<AskQuestionResponseDto> {
    this.logger.log(`RAG 질의: question="${question}"`);

    // 1. 질문 임베딩 생성
    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await this.aiGatewayService.generateEmbedding(question);
    } catch (error) {
      this.logger.warn(`질문 임베딩 생성 실패: ${(error as Error).message}`);
    }

    // 2. 관련 청크 검색
    let searchResults = queryEmbedding
      ? await this.vectorSearchService.semanticSearch(queryEmbedding, RAG_CONTEXT_CHUNKS)
      : [];

    // 시맨틱 검색 실패 시 키워드 fallback
    if (searchResults.length === 0) {
      searchResults = await this.vectorSearchService.keywordSearch(question, RAG_CONTEXT_CHUNKS);
    }

    if (searchResults.length === 0) {
      return AskQuestionResponseDto.from(
        '관련 문서를 찾을 수 없습니다. 먼저 문서를 인덱싱해주세요.',
        [],
      );
    }

    // 3. 컨텍스트 조립
    const contextText = searchResults
      .map((r, i) => `[Chunk ${i + 1} (doc: ${r.chunk.documentId})]:\n${r.chunk.content}`)
      .join('\n\n');

    // 4. AI 호출
    const aiResponse = await this.aiGatewayService.chat([
      { role: 'system', content: RAG_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nQuestion: ${question}`,
      },
    ]);

    // 5. 출처 정보 조립
    const sources = searchResults.map((r) =>
      SourceChunkDto.from(r.chunk.id, r.chunk.documentId, r.chunk.content, r.score),
    );

    return AskQuestionResponseDto.from(aiResponse.content, sources);
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
