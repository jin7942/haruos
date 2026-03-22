import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentStatus } from './entities/document.entity';
import { CreateDocumentRequestDto } from './dto/create-document.request.dto';
import { UpdateDocumentRequestDto } from './dto/update-document.request.dto';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { DocEngineService } from '../../core/doc-engine/doc-engine.service';
import {
  ResourceNotFoundException,
  ValidationException,
} from '../../common/exceptions/business.exception';

/**
 * 문서 에이전트 서비스.
 * 문서 CRUD, AI 요약, Action Item 추출, DOCX 변환을 담당한다.
 */
@Injectable()
export class DocumentAgentService {
  private readonly logger = new Logger(DocumentAgentService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly aiGatewayService: AiGatewayService,
    private readonly docEngineService: DocEngineService,
  ) {}

  /**
   * 문서를 생성한다.
   *
   * @param userId - 사용자 ID
   * @param dto - 문서 생성 정보
   * @returns 생성된 문서
   */
  async createDocument(userId: string, dto: CreateDocumentRequestDto): Promise<Document> {
    const document = this.documentRepository.create({
      userId,
      title: dto.title,
      content: dto.content ?? null,
      type: dto.type,
      status: DocumentStatus.DRAFT,
    });

    const saved = await this.documentRepository.save(document);
    this.logger.log(`문서 생성: id=${saved.id}, type=${saved.type}`);
    return saved;
  }

  /**
   * 문서를 수정한다. 상태 변경은 엔티티 비즈니스 메서드를 통해 수행.
   *
   * @param id - 문서 ID
   * @param dto - 수정할 필드
   * @returns 수정된 문서
   * @throws ResourceNotFoundException 문서가 존재하지 않는 경우
   */
  async updateDocument(id: string, dto: UpdateDocumentRequestDto): Promise<Document> {
    const document = await this.documentRepository.findOne({ where: { id } });
    if (!document) {
      throw new ResourceNotFoundException('Document', id);
    }

    if (dto.title !== undefined) document.title = dto.title;
    if (dto.content !== undefined) document.content = dto.content;

    if (dto.status === DocumentStatus.PUBLISHED) {
      document.publish();
    } else if (dto.status === DocumentStatus.ARCHIVED) {
      document.archive();
    }

    return this.documentRepository.save(document);
  }

  /**
   * 사용자의 문서 목록을 조회한다.
   *
   * @param userId - 사용자 ID
   * @param type - 문서 타입 필터 (선택)
   * @returns 문서 목록
   */
  async getDocuments(userId: string, type?: string): Promise<Document[]> {
    const where: Record<string, unknown> = { userId };
    if (type) {
      where.type = type;
    }

    return this.documentRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 문서 내용을 AI로 요약한다.
   *
   * @param documentId - 문서 ID
   * @returns 요약된 텍스트
   * @throws ResourceNotFoundException 문서가 존재하지 않는 경우
   * @throws ValidationException 문서 내용이 비어있는 경우
   */
  async summarize(documentId: string): Promise<string> {
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new ResourceNotFoundException('Document', documentId);
    }

    if (!document.content || document.content.trim().length === 0) {
      throw new ValidationException('Document content is empty');
    }

    this.logger.log(`문서 요약 시작: id=${documentId}`);
    return this.aiGatewayService.summarize(document.content);
  }

  /**
   * 문서에서 Action Item을 추출한다.
   *
   * @param documentId - 문서 ID
   * @returns Action Item 목록
   * @throws ResourceNotFoundException 문서가 존재하지 않는 경우
   * @throws ValidationException 문서 내용이 비어있는 경우
   */
  async extractActionItems(documentId: string): Promise<string[]> {
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new ResourceNotFoundException('Document', documentId);
    }

    if (!document.content || document.content.trim().length === 0) {
      throw new ValidationException('Document content is empty');
    }

    this.logger.log(`Action Item 추출 시작: id=${documentId}`);
    const response = await this.aiGatewayService.chat([
      {
        role: 'system',
        content: '주어진 문서에서 Action Item을 추출하세요. 각 항목은 줄바꿈으로 구분합니다.',
      },
      { role: 'user', content: document.content },
    ]);

    return response.content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * 문서를 DOCX 파일로 변환한다.
   *
   * @param documentId - 문서 ID
   * @returns DOCX 파일 Buffer
   * @throws ResourceNotFoundException 문서가 존재하지 않는 경우
   * @throws ValidationException 문서 내용이 비어있는 경우
   */
  async exportToDocx(documentId: string): Promise<Buffer> {
    const document = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!document) {
      throw new ResourceNotFoundException('Document', documentId);
    }

    if (!document.content || document.content.trim().length === 0) {
      throw new ValidationException('Document content is empty');
    }

    this.logger.log(`DOCX 변환 시작: id=${documentId}`);
    return this.docEngineService.markdownToDocx(document.content, document.title);
  }
}
