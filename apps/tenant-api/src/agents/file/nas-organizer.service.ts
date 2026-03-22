import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { File } from './entities/file.entity';
import { StorageService } from '../../core/storage/storage.service';
import { getCategoryByMimeType } from './nas.config';
import { NasScannerService, ScanResult } from './nas-scanner.service';

/** 파일 정리 결과 */
export interface OrganizeResult {
  organized: number;
  skipped: number;
  extracted: number;
  errors: string[];
}

/**
 * NAS 파일 정리 서비스.
 * 미분류 파일에 카테고리를 자동 부여하고, ZIP 파일을 해제한다.
 */
@Injectable()
export class NasOrganizerService {
  private readonly logger = new Logger(NasOrganizerService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly storageService: StorageService,
    private readonly scannerService: NasScannerService,
  ) {}

  /**
   * 미분류 파일을 스캔하고 MIME 타입 기반으로 카테고리를 자동 부여한다.
   *
   * @param userId - 대상 사용자 ID (null이면 전체)
   * @returns 정리 결과
   */
  async organizeFiles(userId?: string): Promise<OrganizeResult> {
    const scanResults = await this.scannerService.scanUncategorized(userId);
    const result: OrganizeResult = { organized: 0, skipped: 0, extracted: 0, errors: [] };

    if (scanResults.length === 0) {
      this.logger.log('정리할 미분류 파일 없음');
      return result;
    }

    // 배치 카테고리 업데이트
    const updateMap = new Map<string, ScanResult[]>();
    for (const scan of scanResults) {
      const list = updateMap.get(scan.category) ?? [];
      list.push(scan);
      updateMap.set(scan.category, list);
    }

    for (const [category, items] of updateMap) {
      const ids = items.map((item) => item.fileId);
      try {
        await this.fileRepository.update(
          { id: In(ids) },
          { category },
        );
        result.organized += ids.length;
      } catch (error) {
        const msg = `카테고리 업데이트 실패 (${category}): ${(error as Error).message}`;
        this.logger.error(msg);
        result.errors.push(msg);
        result.skipped += ids.length;
      }
    }

    // ZIP 파일 처리
    const zipFiles = scanResults.filter(
      (s) => s.mimeType === 'application/zip' || s.mimeType === 'application/x-zip-compressed',
    );
    for (const zipFile of zipFiles) {
      try {
        await this.extractZip(zipFile.fileId, userId);
        result.extracted++;
      } catch (error) {
        const msg = `ZIP 해제 실패 (${zipFile.originalName}): ${(error as Error).message}`;
        this.logger.error(msg);
        result.errors.push(msg);
      }
    }

    this.logger.log(
      `파일 정리 완료: organized=${result.organized}, extracted=${result.extracted}, skipped=${result.skipped}`,
    );
    return result;
  }

  /**
   * ZIP 파일을 S3에서 다운로드하여 해제하고, 개별 파일을 S3에 업로드한다.
   * yauzl 등 ZIP 라이브러리 의존 없이 기본적인 ZIP 구조만 처리한다.
   *
   * @param fileId - ZIP 파일 ID
   * @param userId - 파일 소유자 ID
   */
  async extractZip(fileId: string, userId?: string): Promise<number> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    let buffer: Buffer;
    try {
      buffer = await this.storageService.download(file.s3Key);
    } catch (error) {
      throw new Error(`ZIP 다운로드 실패: ${(error as Error).message}`);
    }

    // ZIP 내 파일 목록 추출 (간이 파싱 - 실환경에서는 adm-zip/yauzl 사용)
    const entries = this.parseZipEntries(buffer);
    let extractedCount = 0;

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const extractedKey = file.s3Key.replace(/\.zip$/i, '') + '/' + entry.name;
      const mimeType = this.guessMimeType(entry.name);

      try {
        await this.storageService.upload(extractedKey, entry.data, mimeType);

        const newFile = this.fileRepository.create({
          originalName: entry.name,
          s3Key: extractedKey,
          sizeBytes: String(entry.data.length),
          mimeType,
          status: 'UPLOADED',
          category: getCategoryByMimeType(mimeType),
          parentFileId: fileId,
          uploadedBy: userId ?? file.uploadedBy,
        });
        await this.fileRepository.save(newFile);
        extractedCount++;
      } catch (error) {
        this.logger.warn(`ZIP 엔트리 저장 실패: ${entry.name}: ${(error as Error).message}`);
      }
    }

    // 원본 ZIP 상태 업데이트 (비즈니스 메서드로 전이)
    file.markExtracted();
    await this.fileRepository.save(file);

    this.logger.log(`ZIP 해제 완료: fileId=${fileId}, entries=${extractedCount}`);
    return extractedCount;
  }

  /**
   * 간이 ZIP 엔트리 파서.
   * 실환경에서는 adm-zip이나 yauzl을 사용해야 한다.
   * 현재는 ZIP 구조가 아닌 경우 빈 배열을 반환한다.
   */
  private parseZipEntries(buffer: Buffer): Array<{ name: string; data: Buffer; isDirectory: boolean }> {
    // ZIP 매직넘버 검증 (PK\x03\x04)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      this.logger.warn('유효한 ZIP 파일이 아닙니다');
      return [];
    }

    // 간이 파서: Local file header 순회
    const entries: Array<{ name: string; data: Buffer; isDirectory: boolean }> = [];
    let offset = 0;

    while (offset + 30 <= buffer.length) {
      const sig = buffer.readUInt32LE(offset);
      if (sig !== 0x04034b50) break; // Local file header signature

      const compressedSize = buffer.readUInt32LE(offset + 18);
      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      const nameLength = buffer.readUInt16LE(offset + 26);
      const extraLength = buffer.readUInt16LE(offset + 28);
      const compressionMethod = buffer.readUInt16LE(offset + 8);

      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLength);
      const dataStart = offset + 30 + nameLength + extraLength;
      const isDirectory = name.endsWith('/');

      // STORED(0)만 지원 - DEFLATE 등은 adm-zip 필요
      if (compressionMethod === 0 && !isDirectory) {
        const data = buffer.subarray(dataStart, dataStart + uncompressedSize);
        entries.push({ name, data, isDirectory: false });
      } else if (isDirectory) {
        entries.push({ name, data: Buffer.alloc(0), isDirectory: true });
      }

      offset = dataStart + compressedSize;
    }

    return entries;
  }

  /** 파일 확장자에서 MIME 타입을 추측한다. */
  private guessMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      zip: 'application/zip',
    };
    return mimeMap[ext] ?? 'application/octet-stream';
  }
}
