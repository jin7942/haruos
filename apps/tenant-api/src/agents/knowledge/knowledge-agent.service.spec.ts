import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { DocumentChunk } from './entities/document-chunk.entity';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { VectorSearchService } from './vector-search.service';

describe('KnowledgeAgentService', () => {
  let service: KnowledgeAgentService;
  let chunkRepo: jest.Mocked<Repository<DocumentChunk>>;
  let aiGatewayService: jest.Mocked<AiGatewayService>;
  let vectorSearchService: jest.Mocked<VectorSearchService>;

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
            chat: jest.fn(),
          },
        },
        {
          provide: VectorSearchService,
          useValue: {
            semanticSearch: jest.fn(),
            keywordSearch: jest.fn(),
            hybridSearch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(KnowledgeAgentService);
    chunkRepo = module.get(getRepositoryToken(DocumentChunk));
    aiGatewayService = module.get(AiGatewayService);
    vectorSearchService = module.get(VectorSearchService);
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

    it('임베딩 생성 실패 시 null로 저장한다', async () => {
      chunkRepo.delete.mockResolvedValue({ affected: 0 } as any);
      chunkRepo.create.mockImplementation((data) => data as DocumentChunk);
      chunkRepo.save.mockImplementation((chunk) =>
        Promise.resolve({ id: 'chunk-1', ...chunk } as DocumentChunk),
      );
      aiGatewayService.generateEmbedding.mockRejectedValue(new Error('API error'));

      const result = await service.indexDocument('doc-1', '테스트 내용');

      expect(result).toHaveLength(1);
      expect(chunkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ embedding: null }),
      );
    });
  });

  describe('search', () => {
    it('벡터 검색 결과를 반환한다', async () => {
      aiGatewayService.generateEmbedding.mockResolvedValue([0.1, 0.2]);
      const mockChunk = Object.assign(new DocumentChunk(), {
        id: 'c-1',
        documentId: 'doc-1',
        content: '검색 결과',
      });
      vectorSearchService.semanticSearch.mockResolvedValue([
        { chunk: mockChunk, score: 0.85 },
      ]);

      const result = await service.search('키워드');

      expect(result).toHaveLength(1);
      expect(result[0].chunkId).toBe('c-1');
      expect(result[0].score).toBe(0.85);
    });

    it('임베딩 실패 시 키워드 fallback으로 검색한다', async () => {
      aiGatewayService.generateEmbedding.mockRejectedValue(new Error('fail'));
      const mockChunk = Object.assign(new DocumentChunk(), {
        id: 'c-1',
        documentId: 'doc-1',
        content: '키워드 포함 텍스트',
      });
      vectorSearchService.keywordSearch.mockResolvedValue([
        { chunk: mockChunk, score: 0.5 },
      ]);

      const result = await service.search('키워드');

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(0.5);
      expect(vectorSearchService.keywordSearch).toHaveBeenCalled();
    });
  });

  describe('askQuestion', () => {
    it('RAG 질의응답을 수행한다', async () => {
      aiGatewayService.generateEmbedding.mockResolvedValue([0.1, 0.2]);
      const mockChunk = Object.assign(new DocumentChunk(), {
        id: 'c-1',
        documentId: 'doc-1',
        content: '관련 컨텍스트',
      });
      vectorSearchService.semanticSearch.mockResolvedValue([
        { chunk: mockChunk, score: 0.9 },
      ]);
      aiGatewayService.chat.mockResolvedValue({
        content: 'AI 답변입니다.',
        model: 'test-model',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await service.askQuestion('질문');

      expect(result.answer).toBe('AI 답변입니다.');
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].chunkId).toBe('c-1');
      expect(result.sources[0].score).toBe(0.9);
    });

    it('관련 청크가 없으면 안내 메시지를 반환한다', async () => {
      aiGatewayService.generateEmbedding.mockResolvedValue([0.1, 0.2]);
      vectorSearchService.semanticSearch.mockResolvedValue([]);
      vectorSearchService.keywordSearch.mockResolvedValue([]);

      const result = await service.askQuestion('질문');

      expect(result.answer).toContain('관련 문서를 찾을 수 없습니다');
      expect(result.sources).toHaveLength(0);
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
