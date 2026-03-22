import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from '../entities/batch-job.entity';

/** 배치 작업 이름 상수. */
export const CLICKUP_SYNC_JOB_NAME = 'clickup-sync';

/**
 * ClickUp 동기화 배치 작업.
 * 6시간마다 실행되어 ClickUp의 태스크/프로젝트를 로컬 DB와 동기화한다.
 * - 새로운 태스크 가져오기, 상태 변경 반영, 삭제된 태스크 처리.
 */
@Injectable()
export class ClickUpSyncJob {
  private readonly logger = new Logger(ClickUpSyncJob.name);

  constructor(
    @InjectRepository(BatchJob)
    private readonly batchJobRepository: Repository<BatchJob>,
  ) {}

  /**
   * 6시간마다 실행 (0:00, 6:00, 12:00, 18:00).
   */
  @Cron('0 */6 * * *', { name: CLICKUP_SYNC_JOB_NAME })
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
      where: { name: CLICKUP_SYNC_JOB_NAME },
    });

    if (jobRecord && !jobRecord.isEnabled) {
      this.logger.log('ClickUp sync job is disabled, skipping');
      return;
    }

    try {
      this.logger.log('ClickUp sync job started');

      // TODO(2026-03-22): ClickUpService 연동 후 실제 동기화 로직 구현
      // 1. ClickUp 스페이스/리스트 목록 조회
      // 2. 각 리스트의 태스크 조회
      // 3. 로컬 프로젝트/태스크와 diff 비교
      // 4. 변경사항 반영 (생성/수정/삭제)

      const durationMs = Date.now() - startTime;
      if (jobRecord) {
        jobRecord.recordExecution('SUCCESS', durationMs);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.log(`ClickUp sync job completed in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (jobRecord) {
        jobRecord.recordExecution('FAILED', durationMs, errorMessage);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.error(`ClickUp sync job failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
