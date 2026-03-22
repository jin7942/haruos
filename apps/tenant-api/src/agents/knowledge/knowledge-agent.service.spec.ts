import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { DocumentChunk } from './entities/document-chunk.entity';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';

describe('KnowledgeAgentService', () => {
  let service: KnowledgeAgentService;
  let chunkRepo: jest.Mocked<Repository<DocumentChunk>>;
  let aiGatewayService: jest.Mocked<AiGatewayService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeAgentService,
        {
          provide: getRepositoryToken(DocumentChunk),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AiGatewayService,
          useValue: {
            generateEmbedding: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(KnowledgeAgentService);
    chunkRepo = module.get(getRepositoryToken(DocumentChunk));
    aiGatewayService = module.get(AiGatewayService);
  });

  describe('indexDocument', () => {
    it('문서를 청크로 분할하여 저장한다', async () => {
      const content = '첫 번째 단락입니다.\n\n두 번째 단락입니다.';
      chunkRepo.delete.mockResolvedValue({ affected: 0 } as any);
      chunkRepo.create.mockImplementation((data) => data as DocumentChunk);
      chunkRepo.save.mockImplementation((chunk) =>
        Promise.resolve({ id: 'chunk-1', ...chunk } as DocumentChunk),
      );

      const result = await service.indexDocument('doc-1', content);

      expect(result.length).toBeGreaterThan(0);
      expect(chunkRepo.delete).toHaveBeenCalledWith({ documentId: 'doc-1' });
    });

    it('빈 문서는 빈 배열을 반환한다', async () => {
      chunkRepo.delete.mockResolvedValue({ affected: 0 } as any);

      const result = await service.indexDocument('doc-1', '');

      expect(result).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('LIKE 검색으로 관련 청크를 반환한다', async () => {
      const mockChunks = [
        { id: 'c-1', documentId: 'doc-1', content: '검색 키워드 포함 텍스트', chunkIndex: 0 },
      ];
      chunkRepo.find.mockResolvedValue(mockChunks as DocumentChunk[]);

      const result = await service.search('키워드');

      expect(result).toHaveLength(1);
      expect(result[0].chunkId).toBe('c-1');
      expect(result[0].score).toBe(0.5);
    });
  });

  describe('deleteDocumentChunks', () => {
    it('문서의 모든 청크를 삭제한다', async () => {
      chunkRepo.delete.mockResolvedValue({ affected: 3 } as any);

      await service.deleteDocumentChunks('doc-1');

      expect(chunkRepo.delete).toHaveBeenCalledWith({ documentId: 'doc-1' });
    });
  });
});
