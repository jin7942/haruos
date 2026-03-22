import { Test, TestingModule } from '@nestjs/testing';
import { DocEngineService } from './doc-engine.service';
import { ValidationException } from '../../common/exceptions/business.exception';

describe('DocEngineService', () => {
  let service: DocEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocEngineService],
    }).compile();

    service = module.get<DocEngineService>(DocEngineService);
  });

  describe('markdownToDocx', () => {
    it('Markdown을 Buffer로 변환한다', async () => {
      const result = await service.markdownToDocx('# Hello');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('빈 Markdown이면 ValidationException을 던진다', async () => {
      await expect(service.markdownToDocx('')).rejects.toThrow(ValidationException);
    });

    it('공백만 있는 Markdown이면 ValidationException을 던진다', async () => {
      await expect(service.markdownToDocx('   ')).rejects.toThrow(ValidationException);
    });
  });

  describe('convert', () => {
    it('변환 결과 메타데이터를 반환한다', async () => {
      const result = await service.convert('# Report', 'monthly-report');

      expect(result.filename).toBe('monthly-report.docx');
      expect(result.size).toBeGreaterThan(0);
      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
    });

    it('기본 파일명을 사용한다', async () => {
      const result = await service.convert('# Test');

      expect(result.filename).toBe('document.docx');
    });
  });
});
