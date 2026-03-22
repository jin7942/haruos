import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NasOrganizerService } from './nas-organizer.service';
import { NasScannerService } from './nas-scanner.service';
import { File } from './entities/file.entity';
import { StorageService } from '../../core/storage/storage.service';

describe('NasOrganizerService', () => {
  let service: NasOrganizerService;
  let fileRepo: jest.Mocked<Repository<File>>;
  let storageService: jest.Mocked<StorageService>;
  let scannerService: jest.Mocked<NasScannerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NasOrganizerService,
        {
          provide: getRepositoryToken(File),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            upload: jest.fn(),
            download: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: NasScannerService,
          useValue: {
            scanUncategorized: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(NasOrganizerService);
    fileRepo = module.get(getRepositoryToken(File));
    storageService = module.get(StorageService);
    scannerService = module.get(NasScannerService);
  });

  describe('organizeFiles', () => {
    it('미분류 파일이 없으면 빈 결과를 반환한다', async () => {
      scannerService.scanUncategorized.mockResolvedValue([]);

      const result = await service.organizeFiles();

      expect(result.organized).toBe(0);
      expect(result.extracted).toBe(0);
    });

    it('미분류 파일에 카테고리를 부여한다', async () => {
      scannerService.scanUncategorized.mockResolvedValue([
        { fileId: 'f-1', originalName: 'test.pdf', mimeType: 'application/pdf', category: 'DOCUMENT', sizeBytes: '1024' },
        { fileId: 'f-2', originalName: 'img.png', mimeType: 'image/png', category: 'IMAGE', sizeBytes: '2048' },
      ]);
      fileRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.organizeFiles();

      expect(result.organized).toBe(2);
      expect(fileRepo.update).toHaveBeenCalledTimes(2); // DOCUMENT, IMAGE 각 1회
    });

    it('ZIP 파일을 감지하고 해제를 시도한다', async () => {
      scannerService.scanUncategorized.mockResolvedValue([
        { fileId: 'f-zip', originalName: 'archive.zip', mimeType: 'application/zip', category: 'ARCHIVE', sizeBytes: '5000' },
      ]);
      fileRepo.update.mockResolvedValue({ affected: 1 } as any);
      fileRepo.findOne.mockResolvedValue({
        id: 'f-zip',
        s3Key: 'files/user-1/uuid/archive.zip',
        uploadedBy: 'user-1',
      } as File);
      // ZIP 다운로드 - 유효하지 않은 ZIP이므로 빈 배열 반환됨
      storageService.download.mockResolvedValue(Buffer.from('not a zip'));

      const result = await service.organizeFiles();

      expect(result.organized).toBe(1);
      // extractZip은 호출되지만 유효하지 않은 ZIP이므로 extracted는 0
    });
  });

  describe('extractZip', () => {
    it('존재하지 않는 파일이면 에러를 던진다', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(service.extractZip('not-found')).rejects.toThrow('File not found');
    });

    it('유효한 STORED ZIP 파일을 해제한다', async () => {
      const file = { id: 'f-1', s3Key: 'files/u/id/test.zip', uploadedBy: 'u-1' } as File;
      fileRepo.findOne.mockResolvedValue(file);

      // STORED ZIP (compression method 0) 생성
      const zipBuffer = createStoredZipBuffer('hello.txt', Buffer.from('Hello'));
      storageService.download.mockResolvedValue(zipBuffer);
      storageService.upload.mockResolvedValue(undefined);
      fileRepo.create.mockImplementation((data) => data as File);
      fileRepo.save.mockImplementation((f) => Promise.resolve({ id: 'new-id', ...f } as File));
      fileRepo.update.mockResolvedValue({ affected: 1 } as any);

      const count = await service.extractZip('f-1');

      expect(count).toBe(1);
      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringContaining('hello.txt'),
        expect.any(Buffer),
        'text/plain',
      );
    });
  });
});

/** 테스트용 STORED ZIP 버퍼를 생성한다 (compression method 0). */
function createStoredZipBuffer(fileName: string, data: Buffer): Buffer {
  const nameBytes = Buffer.from(fileName, 'utf8');
  const crc = 0; // CRC 생략 (테스트용)

  // Local file header (30 + nameLen + data)
  const localHeader = Buffer.alloc(30 + nameBytes.length + data.length);
  localHeader.writeUInt32LE(0x04034b50, 0); // Signature
  localHeader.writeUInt16LE(20, 4);          // Version needed
  localHeader.writeUInt16LE(0, 6);           // Flags
  localHeader.writeUInt16LE(0, 8);           // Compression (STORED)
  localHeader.writeUInt16LE(0, 10);          // Mod time
  localHeader.writeUInt16LE(0, 12);          // Mod date
  localHeader.writeUInt32LE(crc, 14);        // CRC-32
  localHeader.writeUInt32LE(data.length, 18); // Compressed size
  localHeader.writeUInt32LE(data.length, 22); // Uncompressed size
  localHeader.writeUInt16LE(nameBytes.length, 26); // Name length
  localHeader.writeUInt16LE(0, 28);          // Extra field length
  nameBytes.copy(localHeader, 30);
  data.copy(localHeader, 30 + nameBytes.length);

  // Central directory header
  const cdHeader = Buffer.alloc(46 + nameBytes.length);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt16LE(0, 8);
  cdHeader.writeUInt16LE(0, 10);
  cdHeader.writeUInt16LE(0, 12);
  cdHeader.writeUInt16LE(0, 14);
  cdHeader.writeUInt32LE(crc, 16);
  cdHeader.writeUInt32LE(data.length, 20);
  cdHeader.writeUInt32LE(data.length, 24);
  cdHeader.writeUInt16LE(nameBytes.length, 28);
  cdHeader.writeUInt16LE(0, 30);
  cdHeader.writeUInt16LE(0, 32);
  cdHeader.writeUInt16LE(0, 34);
  cdHeader.writeUInt16LE(0, 36);
  cdHeader.writeUInt32LE(0, 38);
  cdHeader.writeUInt32LE(0, 42);
  nameBytes.copy(cdHeader, 46);

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdHeader.length, 12);
  eocd.writeUInt32LE(localHeader.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localHeader, cdHeader, eocd]);
}
