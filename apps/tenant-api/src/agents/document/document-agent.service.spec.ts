import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentAgentService } from './document-agent.service';
import { Document, DocumentStatus } from './entities/document.entity';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { DocEngineService } from '../../core/doc-engine/doc-engine.service';
import { StorageService } from '../../core/storage/storage.service';
import {
  ResourceNotFoundException,
  ValidationException,
  InvalidStateTransitionException,
} from '../../common/exceptions/business.exception';

describe('DocumentAgentService', () => {
  let service: DocumentAgentService;
  let documentRepo: jest.Mocked<Repository<Document>>;
  let aiGatewayService: jest.Mocked<AiGatewayService>;
  let docEngineService: jest.Mocked<DocEngineService>;
  let storageService: jest.Mocked<StorageService>;

  const mockDocument: Partial<Document> = {
    id: 'd-1',
    createdBy: 'user-1',
    title: '팀 회의록',
    content: '# 회의록\n\n## 안건\n- 프로젝트 진행 상황\n- 다음 스프린트 계획',
    type: 'MEETING_NOTE',
    status: DocumentStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentAgentService,
        {
          provide: getRepositoryToken(Document),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: AiGatewayService,
          useValue: {
            summarize: jest.fn(),
            chat: jest.fn(),
          },
        },
        {
          provide: DocEngineService,
          useValue: {
            markdownToDocx: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            upload: jest.fn(),
            getFileInfo: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DocumentAgentService);
    documentRepo = module.get(getRepositoryToken(Document));
    aiGatewayService = module.get(AiGatewayService);
    docEngineService = module.get(DocEngineService);
    storageService = module.get(StorageService);
  });

  describe('createDocument', () => {
    it('문서를 생성한다', async () => {
      documentRepo.create.mockReturnValue(mockDocument as Document);
      documentRepo.save.mockResolvedValue(mockDocument as Document);

      const result = await service.createDocument('user-1', {
        title: '팀 회의록',
        content: '# 회의록',
        type: 'MEETING_NOTE',
      });

      expect(result.title).toBe('팀 회의록');
      expect(documentRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateDocument', () => {
    it('DRAFT 문서를 PUBLISHED로 변경한다', async () => {
      const document = Object.assign(new Document(), mockDocument);
      documentRepo.findOne.mockResolvedValue(document);
      documentRepo.save.mockImplementation((d) => Promise.resolve(d as Document));

      const result = await service.updateDocument('d-1', { status: 'PUBLISHED' });

      expect(result.status).toBe(DocumentStatus.PUBLISHED);
    });

    it('DRAFT가 아닌 문서를 PUBLISHED로 변경하면 예외를 던진다', async () => {
      const document = Object.assign(new Document(), {
        ...mockDocument,
        status: DocumentStatus.ARCHIVED,
      });
      documentRepo.findOne.mockResolvedValue(document);

      await expect(service.updateDocument('d-1', { status: 'PUBLISHED' })).rejects.toThrow(
        InvalidStateTransitionException,
      );
    });
  });

  describe('summarize', () => {
    it('문서 내용을 요약한다', async () => {
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      aiGatewayService.summarize.mockResolvedValue('팀 미팅 요약: 프로젝트 진행 상황 논의');

      const result = await service.summarize('d-1');

      expect(result).toBe('팀 미팅 요약: 프로젝트 진행 상황 논의');
      expect(aiGatewayService.summarize).toHaveBeenCalledWith(mockDocument.content);
    });

    it('내용이 없는 문서 요약 시 ValidationException을 던진다', async () => {
      documentRepo.findOne.mockResolvedValue({
        ...mockDocument,
        content: null,
      } as Document);

      await expect(service.summarize('d-1')).rejects.toThrow(ValidationException);
    });

    it('존재하지 않는 문서 요약 시 ResourceNotFoundException을 던진다', async () => {
      documentRepo.findOne.mockResolvedValue(null);

      await expect(service.summarize('not-found')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('extractActionItems', () => {
    it('문서에서 Action Item을 추출한다', async () => {
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      aiGatewayService.chat.mockResolvedValue({
        content: '디자인 리뷰 완료\n백엔드 API 구현\nQA 테스트',
        model: 'claude-sonnet',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await service.extractActionItems('d-1');

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('디자인 리뷰 완료');
    });
  });

  describe('exportToDocx', () => {
    it('문서를 DOCX로 변환한다', async () => {
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      const mockBuffer = Buffer.from('docx-content');
      docEngineService.markdownToDocx.mockResolvedValue(mockBuffer);

      const result = await service.exportToDocx('d-1');

      expect(result).toBe(mockBuffer);
      expect(docEngineService.markdownToDocx).toHaveBeenCalledWith(
        mockDocument.content,
        mockDocument.title,
      );
    });
  });

  describe('getShareLink', () => {
    it('문서를 S3에 업로드하고 presigned URL을 반환한다', async () => {
      documentRepo.findOne.mockResolvedValue(mockDocument as Document);
      const mockBuffer = Buffer.from('docx-content');
      docEngineService.markdownToDocx.mockResolvedValue(mockBuffer);
      storageService.upload.mockResolvedValue(undefined);
      storageService.getFileInfo.mockResolvedValue({
        key: 'shared/documents/d-1.docx',
        url: 'https://s3.example.com/shared/documents/d-1.docx?signed=true',
      });

      const result = await service.getShareLink('d-1');

      expect(result.url).toBe('https://s3.example.com/shared/documents/d-1.docx?signed=true');
      expect(result.expiresIn).toBe(3600);
      expect(storageService.upload).toHaveBeenCalledWith(
        'shared/documents/d-1.docx',
        mockBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('존재하지 않는 문서의 공유 링크 생성 시 ResourceNotFoundException을 던진다', async () => {
      documentRepo.findOne.mockResolvedValue(null);

      await expect(service.getShareLink('not-found')).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
