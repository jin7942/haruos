import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NasScannerService } from './nas-scanner.service';
import { File } from './entities/file.entity';

describe('NasScannerService', () => {
  let service: NasScannerService;
  let fileRepo: jest.Mocked<Repository<File>>;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NasScannerService,
        {
          provide: getRepositoryToken(File),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get(NasScannerService);
    fileRepo = module.get(getRepositoryToken(File));
  });

  describe('scanUncategorized', () => {
    it('미분류 파일을 스캔하고 카테고리를 추천한다', async () => {
      const mockFiles = [
        { id: 'f-1', originalName: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: '1024' },
        { id: 'f-2', originalName: 'image.png', mimeType: 'image/png', sizeBytes: '2048' },
      ];
      fileRepo.find.mockResolvedValue(mockFiles as File[]);

      const result = await service.scanUncategorized();

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('DOCUMENT');
      expect(result[1].category).toBe('IMAGE');
    });

    it('특정 사용자 파일만 스캔한다', async () => {
      fileRepo.find.mockResolvedValue([]);

      await service.scanUncategorized('user-1');

      expect(fileRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ uploadedBy: 'user-1' }),
        }),
      );
    });
  });

  describe('getCategorySummary', () => {
    it('카테고리별 파일 수를 반환한다', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { category: 'DOCUMENT', count: '5' },
        { category: 'IMAGE', count: '3' },
        { category: null, count: '2' },
      ]);

      const result = await service.getCategorySummary();

      expect(result.DOCUMENT).toBe(5);
      expect(result.IMAGE).toBe(3);
      expect(result.UNCATEGORIZED).toBe(2);
    });
  });
});
