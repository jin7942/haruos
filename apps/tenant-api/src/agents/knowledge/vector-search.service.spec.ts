import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VectorSearchService } from './vector-search.service';
import { DocumentChunk } from './entities/document-chunk.entity';

describe('VectorSearchService', () => {
  let service: VectorSearchService;
  let chunkRepo: jest.Mocked<Repository<DocumentChunk>>;

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorSearchService,
        {
          provide: getRepositoryToken(DocumentChunk),
          useValue: {
            query: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get(VectorSearchService);
    chunkRepo = module.get(getRepositoryToken(DocumentChunk));
  });

  describe('semanticSearch', () => {
    it('코사인 유사도 쿼리를 실행하고 결과를 반환한다', async () => {
      const mockRows = [
        {
          id: 'c-1',
          document_id: 'doc-1',
          chunk_index: 0,
          content: '테스트 청크',
          token_count: 10,
          embedding: null,
          created_at: new Date(),
          updated_at: new Date(),
          score: 0.85,
        },
      ];
      chunkRepo.query.mockResolvedValue(mockRows);

      const result = await service.semanticSearch([0.1, 0.2, 0.3], 5);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(0.85);
      expect(result[0].chunk.id).toBe('c-1');
      expect(chunkRepo.query).toHaveBeenCalledWith(
        expect.stringContaining('embedding::vector'),
        expect.any(Array),
      );
    });

    it('pgvector 미설치 시 빈 배열을 반환한다', async () => {
      chunkRepo.query.mockRejectedValue(new Error('pgvector not available'));

      const result = await service.semanticSearch([0.1, 0.2], 5);

      expect(result).toHaveLength(0);
    });
  });

  describe('keywordSearch', () => {
    it('ILIKE 키워드 검색을 실행한다', async () => {
      const mockChunks = [
        Object.assign(new DocumentChunk(), {
          id: 'c-1',
          documentId: 'doc-1',
          content: '검색 키워드 포함',
          chunkIndex: 0,
        }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockChunks);

      const result = await service.keywordSearch('키워드', 10);

      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(0.5);
      expect(result[0].chunk.content).toContain('키워드');
    });
  });

  describe('hybridSearch', () => {
    it('벡터 + 키워드 결과를 병합한다', async () => {
      const vectorRows = [
        {
          id: 'c-1',
          document_id: 'doc-1',
          chunk_index: 0,
          content: '벡터 결과',
          token_count: 5,
          embedding: null,
          created_at: new Date(),
          updated_at: new Date(),
          score: 0.9,
        },
      ];
      chunkRepo.query.mockResolvedValue(vectorRows);

      const keywordChunks = [
        Object.assign(new DocumentChunk(), {
          id: 'c-2',
          documentId: 'doc-1',
          content: '키워드 결과',
          chunkIndex: 1,
        }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(keywordChunks);

      const result = await service.hybridSearch('테스트', [0.1, 0.2], 10);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('벡터 검색 실패 시 키워드 결과만 반환한다', async () => {
      chunkRepo.query.mockRejectedValue(new Error('pgvector error'));

      const keywordChunks = [
        Object.assign(new DocumentChunk(), {
          id: 'c-1',
          documentId: 'doc-1',
          content: '키워드 결과',
          chunkIndex: 0,
        }),
      ];
      mockQueryBuilder.getMany.mockResolvedValue(keywordChunks);

      const result = await service.hybridSearch('테스트', [0.1], 10);

      expect(result).toHaveLength(1);
      expect(result[0].chunk.content).toBe('키워드 결과');
    });
  });
});
