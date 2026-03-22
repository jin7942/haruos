import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { File } from './entities/file.entity';
import { getCategoryByMimeType } from './nas.config';

/** 스캔 결과 항목 */
export interface ScanResult {
  fileId: string;
  originalName: string;
  mimeType: string;
  category: string;
  sizeBytes: string;
}

/**
 * NAS 스캐너 서비스.
 * 저장된 파일들을 스캔하여 카테고리 미분류 파일을 탐색하고 메타데이터를 수집한다.
 */
@Injectable()
export class NasScannerService {
  private readonly logger = new Logger(NasScannerService.name);

  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  /**
   * 카테고리가 지정되지 않은 파일 목록을 스캔한다.
   *
   * @param userId - 대상 사용자 ID (null이면 전체)
   * @returns 미분류 파일 스캔 결과
   */
  async scanUncategorized(userId?: string): Promise<ScanResult[]> {
    const where: Record<string, unknown> = { category: IsNull() };
    if (userId) {
      where.uploadedBy = userId;
    }

    const files = await this.fileRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    this.logger.log(`미분류 파일 스캔 완료: ${files.length}건`);

    return files.map((file) => ({
      fileId: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      category: getCategoryByMimeType(file.mimeType),
      sizeBytes: file.sizeBytes,
    }));
  }

  /**
   * 전체 파일을 카테고리별로 집계한다.
   *
   * @param userId - 대상 사용자 ID (null이면 전체)
   * @returns 카테고리별 파일 수
   */
  async getCategorySummary(userId?: string): Promise<Record<string, number>> {
    const queryBuilder = this.fileRepository
      .createQueryBuilder('file')
      .select('file.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy('file.category');

    if (userId) {
      queryBuilder.where('file.uploadedBy = :userId', { userId });
    }

    const rows: Array<{ category: string | null; count: string }> = await queryBuilder.getRawMany();

    const summary: Record<string, number> = {};
    for (const row of rows) {
      summary[row.category ?? 'UNCATEGORIZED'] = parseInt(row.count, 10);
    }

    return summary;
  }
}
