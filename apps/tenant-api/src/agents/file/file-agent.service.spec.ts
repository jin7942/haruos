import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAgentService } from './file-agent.service';
import { File } from './entities/file.entity';
import { StorageService } from '../../core/storage/storage.service';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

describe('FileAgentService', () => {
  let service: FileAgentService;
  let fileRepo: jest.Mocked<Repository<File>>;
  let storageService: jest.Mocked<StorageService>;

  const mockFile: Partial<File> = {
    id: 'f-1',
    originalName: 'test.pdf',
    s3Key: 'files/user-1/uuid/test.pdf',
    sizeBytes: '1024',
    mimeType: 'application/pdf',
    status: 'UPLOADED',
    category: null,
    projectId: null,
    parentFileId: null,
    uploadedBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileAgentService,
        {
          provide: getRepositoryToken(File),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            upload: jest.fn(),
            delete: jest.fn(),
            getFileInfo: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(FileAgentService);
    fileRepo = module.get(getRepositoryToken(File));
    storageService = module.get(StorageService);
  });

  describe('uploadFile', () => {
    it('파일을 S3에 업로드하고 레코드를 생성한다', async () => {
      const buffer = Buffer.from('file content');
      storageService.upload.mockResolvedValue(undefined);
      fileRepo.create.mockReturnValue(mockFile as File);
      fileRepo.save.mockResolvedValue(mockFile as File);

      const result = await service.uploadFile('user-1', 'test.pdf', buffer, 'application/pdf');

      expect(result.originalName).toBe('test.pdf');
      expect(storageService.upload).toHaveBeenCalledWith(
        expect.stringContaining('files/user-1/'),
        buffer,
        'application/pdf',
      );
    });
  });

  describe('getFiles', () => {
    it('사용자의 파일 목록을 반환한다', async () => {
      fileRepo.find.mockResolvedValue([mockFile as File]);

      const result = await service.getFiles('user-1');

      expect(result).toHaveLength(1);
      expect(fileRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { uploadedBy: 'user-1' },
        }),
      );
    });
  });

  describe('getFileUrl', () => {
    it('파일의 Presigned URL을 반환한다', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile as File);
      storageService.getFileInfo.mockResolvedValue({
        key: mockFile.s3Key!,
        url: 'https://s3.amazonaws.com/presigned-url',
      });

      const result = await service.getFileUrl('f-1');

      expect(result).toBe('https://s3.amazonaws.com/presigned-url');
    });

    it('존재하지 않는 파일 URL 조회 시 ResourceNotFoundException을 던진다', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(service.getFileUrl('not-found')).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('deleteFile', () => {
    it('파일을 S3에서 삭제하고 레코드를 제거한다', async () => {
      fileRepo.findOne.mockResolvedValue(mockFile as File);
      storageService.delete.mockResolvedValue(undefined);
      fileRepo.remove.mockResolvedValue(mockFile as File);

      await service.deleteFile('f-1');

      expect(storageService.delete).toHaveBeenCalledWith(mockFile.s3Key);
      expect(fileRepo.remove).toHaveBeenCalled();
    });

    it('존재하지 않는 파일 삭제 시 ResourceNotFoundException을 던진다', async () => {
      fileRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteFile('not-found')).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
