import { Controller, Post, Delete, Body, Param, Query, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { IndexDocumentRequestDto } from './dto/index-document.request.dto';
import { KnowledgeSearchResponseDto } from './dto/knowledge-search.response.dto';

/**
 * 지식 에이전트 컨트롤러.
 * 문서 인덱싱 및 지식 검색(RAG) API를 제공한다.
 */
@ApiTags('Knowledge Agent')
@ApiBearerAuth()
@Controller('agents/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeAgentService: KnowledgeAgentService) {}

  /**
   * 문서를 인덱싱한다 (청크 분할 + 임베딩).
   *
   * @param dto - 인덱싱 대상 문서 ID와 내용
   */
  @Post('index')
  @ApiOperation({ summary: '문서 인덱싱 (청크 분할 + 임베딩)' })
  @ApiResponse({ status: 201 })
  async indexDocument(@Body() dto: IndexDocumentRequestDto): Promise<{ chunksCreated: number }> {
    // TODO(2026-03-22): documentId로 Document 엔티티에서 content를 조회하는 로직 추가
    // 현재는 간소화를 위해 DocumentAgentService를 통해 호출되는 것을 기대
    const chunks = await this.knowledgeAgentService.indexDocument(dto.documentId, '');
    return { chunksCreated: chunks.length };
  }

  /**
   * 지식을 검색한다.
   *
   * @param query - 검색 쿼리
   * @param limit - 최대 결과 수
   * @returns 검색 결과
   */
  @Get('search')
  @ApiOperation({ summary: '지식 검색 (RAG)' })
  @ApiQuery({ name: 'query', description: '검색 쿼리' })
  @ApiQuery({ name: 'limit', required: false, description: '최대 결과 수 (기본: 10)' })
  @ApiResponse({ status: 200, type: [KnowledgeSearchResponseDto] })
  search(
    @Query('query') query: string,
    @Query('limit') limit?: string,
  ): Promise<KnowledgeSearchResponseDto[]> {
    return this.knowledgeAgentService.search(query, limit ? parseInt(limit, 10) : undefined);
  }

  /**
   * 특정 문서의 청크를 삭제한다.
   *
   * @param documentId - 문서 ID
   */
  @Delete('documents/:documentId')
  @ApiOperation({ summary: '문서 청크 삭제' })
  @ApiResponse({ status: 200 })
  deleteDocumentChunks(@Param('documentId') documentId: string): Promise<void> {
    return this.knowledgeAgentService.deleteDocumentChunks(documentId);
  }
}
