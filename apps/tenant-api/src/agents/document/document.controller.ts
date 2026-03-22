import { Controller, Get, Post, Patch, Body, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { DocumentAgentService } from './document-agent.service';
import { CreateDocumentRequestDto } from './dto/create-document.request.dto';
import { UpdateDocumentRequestDto } from './dto/update-document.request.dto';
import { DocumentResponseDto } from './dto/document.response.dto';
import { ShareLinkResponseDto } from './dto/share-link.response.dto';

/**
 * 문서 에이전트 컨트롤러.
 * 문서 CRUD, AI 요약, Action Item 추출, DOCX 변환, 공유 링크 API를 제공한다.
 */
@ApiTags('Document Agent')
@ApiBearerAuth()
@Controller('agents/documents')
export class DocumentController {
  constructor(private readonly documentAgentService: DocumentAgentService) {}

  /**
   * 문서를 생성한다.
   *
   * @param req - HTTP 요청 (JWT 사용자 정보 포함)
   * @param dto - 문서 생성 정보
   * @returns 생성된 문서
   */
  @Post()
  @ApiOperation({ summary: '문서 생성' })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  async createDocument(
    @Req() req: Request,
    @Body() dto: CreateDocumentRequestDto,
  ): Promise<DocumentResponseDto> {
    const userId = (req as any).user.sub;
    const document = await this.documentAgentService.createDocument(userId, dto);
    return DocumentResponseDto.from(document);
  }

  /**
   * 문서 목록을 조회한다.
   *
   * @param req - HTTP 요청
   * @param type - 문서 타입 필터
   * @returns 문서 목록
   */
  @Get()
  @ApiOperation({ summary: '문서 목록 조회' })
  @ApiQuery({ name: 'type', required: false, enum: ['MEETING_NOTE', 'SUMMARY', 'ACTION_ITEM'] })
  @ApiResponse({ status: 200, type: [DocumentResponseDto] })
  async getDocuments(
    @Req() req: Request,
    @Query('type') type?: string,
  ): Promise<DocumentResponseDto[]> {
    const userId = (req as any).user.sub;
    const documents = await this.documentAgentService.getDocuments(userId, type);
    return documents.map(DocumentResponseDto.from);
  }

  /**
   * 문서를 수정한다.
   *
   * @param id - 문서 ID
   * @param dto - 수정할 필드
   * @returns 수정된 문서
   */
  @Patch(':id')
  @ApiOperation({ summary: '문서 수정' })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentRequestDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentAgentService.updateDocument(id, dto);
    return DocumentResponseDto.from(document);
  }

  /**
   * 문서를 AI로 요약한다.
   *
   * @param id - 문서 ID
   * @returns 요약 텍스트
   */
  @Post(':id/summarize')
  @ApiOperation({ summary: '문서 AI 요약' })
  @ApiResponse({ status: 201, schema: { type: 'object', properties: { summary: { type: 'string' } } } })
  async summarize(@Param('id') id: string): Promise<{ summary: string }> {
    const summary = await this.documentAgentService.summarize(id);
    return { summary };
  }

  /**
   * 문서에서 Action Item을 추출한다.
   *
   * @param id - 문서 ID
   * @returns Action Item 목록
   */
  @Post(':id/action-items')
  @ApiOperation({ summary: 'Action Item 추출' })
  @ApiResponse({ status: 201, schema: { type: 'object', properties: { actionItems: { type: 'array', items: { type: 'string' } } } } })
  async extractActionItems(@Param('id') id: string): Promise<{ actionItems: string[] }> {
    const actionItems = await this.documentAgentService.extractActionItems(id);
    return { actionItems };
  }

  /**
   * 문서를 DOCX 파일로 다운로드한다.
   *
   * @param id - 문서 ID
   * @param res - HTTP 응답
   */
  @Get(':id/export')
  @ApiOperation({ summary: '문서 DOCX 내보내기' })
  @ApiResponse({ status: 200, description: 'DOCX 파일 바이너리' })
  async exportToDocx(@Param('id') id: string, @Res() res: Response): Promise<void> {
    await this.sendDocxResponse(id, res);
  }

  /**
   * 문서를 DOCX 파일로 다운로드한다 (planning.md 엔드포인트 호환).
   *
   * @param id - 문서 ID
   * @param res - HTTP 응답
   */
  @Get(':id/download/docx')
  @ApiOperation({ summary: '문서 DOCX 다운로드' })
  @ApiResponse({ status: 200, description: 'DOCX 파일 바이너리' })
  async downloadDocx(@Param('id') id: string, @Res() res: Response): Promise<void> {
    await this.sendDocxResponse(id, res);
  }

  /**
   * 문서의 공유 링크(presigned URL)를 생성한다.
   * 문서 DOCX를 S3에 업로드 후 presigned URL을 반환한다.
   *
   * @param id - 문서 ID
   * @returns presigned URL 및 만료 시간
   */
  @Get(':id/share')
  @ApiOperation({ summary: '문서 공유 링크 생성 (presigned URL)' })
  @ApiResponse({ status: 200, type: ShareLinkResponseDto })
  async share(@Param('id') id: string): Promise<ShareLinkResponseDto> {
    return this.documentAgentService.getShareLink(id);
  }

  /**
   * DOCX 바이너리를 HTTP 응답으로 전송한다.
   *
   * @param id - 문서 ID
   * @param res - HTTP 응답
   */
  private async sendDocxResponse(id: string, res: Response): Promise<void> {
    const buffer = await this.documentAgentService.exportToDocx(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="document-${id}.docx"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
