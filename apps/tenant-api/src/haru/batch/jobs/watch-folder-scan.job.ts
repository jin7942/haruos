import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from '../entities/batch-job.entity';

/** 배치 작업 이름 상수. */
export const WATCH_FOLDER_SCAN_JOB_NAME = 'watch-folder-scan';

/**
 * 감시 폴더 스캔 배치 작업.
 * 5분마다 실행되어 S3 감시 폴더에 새로 업로드된 파일을 탐지한다.
 * - 새 파일 발견 시 문서 처리 파이프라인(파싱, 임베딩, 인덱싱)을 트리거.
 */
@Injectable()
export class WatchFolderScanJob {
  private readonly logger = new Logger(WatchFolderScanJob.name);

  constructor(
    @InjectRepository(BatchJob)
    private readonly batchJobRepository: Repository<BatchJob>,
  ) {}

  /**
   * 5분마다 실행.
   */
  @Cron('*/5 * * * *', { name: WATCH_FOLDER_SCAN_JOB_NAME })
  async handleCron(): Promise<void> {
    await this.execute();
  }

  /**
   * 수동 트리거 또는 cron에서 호출되는 실행 로직.
   * BatchJob 레코드가 비활성화 상태이면 스킵한다.
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    const jobRecord = await this.batchJobRepository.findOne({
      where: { name: WATCH_FOLDER_SCAN_JOB_NAME },
    });

    if (jobRecord && !jobRecord.isEnabled) {
      this.logger.log('Watch folder scan job is disabled, skipping');
      return;
    }

    try {
      this.logger.log('Watch folder scan job started');

      // TODO(2026-03-22): StorageService 연동 후 실제 스캔 로직 구현
      // 1. S3 감시 폴더 목록 조회 (prefix 기반)
      // 2. 마지막 스캔 이후 새로 생성된 파일 탐지
      // 3. 각 파일에 대해 문서 처리 파이프라인 트리거
      // 4. 처리 완료된 파일을 processed 폴더로 이동

      const durationMs = Date.now() - startTime;
      if (jobRecord) {
        jobRecord.recordExecution('SUCCESS', durationMs);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.log(`Watch folder scan job completed in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (jobRecord) {
        jobRecord.recordExecution('FAILED', durationMs, errorMessage);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.error(`Watch folder scan job failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
