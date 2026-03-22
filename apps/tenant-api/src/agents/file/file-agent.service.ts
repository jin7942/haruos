import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { File } from './entities/file.entity';
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
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
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
  ): Promise<File> {
    const s3Key = `files/${userId}/${randomUUID()}/${fileName}`;

    await this.storageService.upload(s3Key, buffer, mimeType);

    const file = this.fileRepository.create({
      originalName: fileName,
      s3Key,
      sizeBytes: String(buffer.length),
      mimeType,
      status: 'UPLOADED',
      uploadedBy: userId,
    });

    const saved = await this.fileRepository.save(file);
    this.logger.log(`파일 업로드: id=${saved.id}, fileName=${fileName}`);
    return saved;
  }

  /**
   * 사용자의 파일 목록을 조회한다.
   *
   * @param userId - 사용자 ID
   * @returns 파일 목록
   */
  async getFiles(userId: string): Promise<File[]> {
    return this.fileRepository.find({
      where: { uploadedBy: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 파일의 Presigned URL을 반환한다.
   *
   * @param fileId - 파일 ID
   * @returns Presigned URL
   * @throws ResourceNotFoundException 파일이 존재하지 않는 경우
   */
  async getFileUrl(fileId: string): Promise<string> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new ResourceNotFoundException('File', fileId);
    }

    const fileInfo = await this.storageService.getFileInfo(file.s3Key);
    return fileInfo.url;
  }

  /**
   * 파일을 S3에서 삭제하고 메타데이터를 제거한다.
   *
   * @param fileId - 파일 ID
   * @throws ResourceNotFoundException 파일이 존재하지 않는 경우
   */
  async deleteFile(fileId: string): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new ResourceNotFoundException('File', fileId);
    }

    await this.storageService.delete(file.s3Key);
    await this.fileRepository.remove(file);
    this.logger.log(`파일 삭제: id=${fileId}, s3Key=${file.s3Key}`);
  }
}
