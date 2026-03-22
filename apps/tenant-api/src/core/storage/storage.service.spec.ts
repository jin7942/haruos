import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { StoragePort } from './ports/storage.port';

describe('StorageService', () => {
  let service: StorageService;
  let storage: jest.Mocked<StoragePort>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: StoragePort,
          useValue: {
            upload: jest.fn().mockResolvedValue(undefined),
            download: jest.fn().mockResolvedValue(Buffer.from('test')),
            delete: jest.fn().mockResolvedValue(undefined),
            getPresignedUrl: jest.fn().mockResolvedValue('https://example.com/file'),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    storage = module.get(StoragePort);
  });

  describe('upload', () => {
    it('StoragePort.upload을 호출한다', async () => {
      const body = Buffer.from('test content');
      await service.upload('docs/test.pdf', body, 'application/pdf');

      expect(storage.upload).toHaveBeenCalledWith('docs/test.pdf', body, 'application/pdf');
    });
  });

  describe('download', () => {
    it('StoragePort.download을 호출하고 Buffer를 반환한다', async () => {
      const result = await service.download('docs/test.pdf');

      expect(result).toEqual(Buffer.from('test'));
      expect(storage.download).toHaveBeenCalledWith('docs/test.pdf');
    });
  });

  describe('delete', () => {
    it('StoragePort.delete를 호출한다', async () => {
      await service.delete('docs/test.pdf');

      expect(storage.delete).toHaveBeenCalledWith('docs/test.pdf');
    });
  });

  describe('getFileInfo', () => {
    it('Presigned URL을 포함한 파일 정보를 반환한다', async () => {
      const result = await service.getFileInfo('docs/test.pdf', 7200);

      expect(result.key).toBe('docs/test.pdf');
      expect(result.url).toBe('https://example.com/file');
      expect(storage.getPresignedUrl).toHaveBeenCalledWith('docs/test.pdf', 7200);
    });
  });
});
