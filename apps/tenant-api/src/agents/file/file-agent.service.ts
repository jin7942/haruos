import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { FileRecordEntity } from './entities/file-record.entity';
import { StorageService } from '../../core/storage/storage.service';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/**
 * 파일 에이전트 서비스.
 * S3 파일 업로드/다운로드/삭제 및 메타데이터 관리를 담당한다.
 */
@Injectable()
export class FileAgentService {
  private readonly logger = new Logger(FileAgentService.name);

  constructor(
    @InjectRepository(FileRecordEntity)
    private readonly fileRecordRepository: Repository<FileRecordEntity>,
    private readonly storageService: StorageService,
  ) {}

  /**
   * 파일을 S3에 업로드하고 메타데이터를 저장한다.
   *
   * @param userId - 업로드 사용자 ID
   * @param fileName - 원본 파일명
   * @param buffer - 파일 바이너리
   * @param mimeType - MIME 타입
   * @returns 생성된 파일 레코드
   */
  async uploadFile(
    userId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<FileRecordEntity> {
    const s3Key = `files/${userId}/${randomUUID()}/${fileName}`;

    await this.storageService.upload(s3Key, buffer, mimeType);

    const fileRecord = this.fileRecordRepository.create({
      userId,
      fileName,
      s3Key,
      mimeType,
      size: String(buffer.length),
      uploadedAt: new Date(),
    });

    const saved = await this.fileRecordRepository.save(fileRecord);
    this.logger.log(`파일 업로드: id=${saved.id}, fileName=${fileName}`);
    return saved;
  }

  /**
   * 사용자의 파일 목록을 조회한다.
   *
   * @param userId - 사용자 ID
   * @returns 파일 레코드 목록
   */
  async getFiles(userId: string): Promise<FileRecordEntity[]> {
    return this.fileRecordRepository.find({
      where: { userId },
      order: { uploadedAt: 'DESC' },
    });
  }

  /**
   * 파일의 Presigned URL을 반환한다.
   *
   * @param fileId - 파일 레코드 ID
   * @returns Presigned URL
   * @throws ResourceNotFoundException 파일이 존재하지 않는 경우
   */
  async getFileUrl(fileId: string): Promise<string> {
    const fileRecord = await this.fileRecordRepository.findOne({ where: { id: fileId } });
    if (!fileRecord) {
      throw new ResourceNotFoundException('FileRecord', fileId);
    }

    const fileInfo = await this.storageService.getFileInfo(fileRecord.s3Key);
    return fileInfo.url;
  }

  /**
   * 파일을 S3에서 삭제하고 메타데이터를 제거한다.
   *
   * @param fileId - 파일 레코드 ID
   * @throws ResourceNotFoundException 파일이 존재하지 않는 경우
   */
  async deleteFile(fileId: string): Promise<void> {
    const fileRecord = await this.fileRecordRepository.findOne({ where: { id: fileId } });
    if (!fileRecord) {
      throw new ResourceNotFoundException('FileRecord', fileId);
    }

    await this.storageService.delete(fileRecord.s3Key);
    await this.fileRecordRepository.remove(fileRecord);
    this.logger.log(`파일 삭제: id=${fileId}, s3Key=${fileRecord.s3Key}`);
  }
}
