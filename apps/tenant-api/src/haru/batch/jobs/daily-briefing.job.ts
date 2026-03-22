import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from '../entities/batch-job.entity';

/** 배치 작업 이름 상수. */
export const DAILY_BRIEFING_JOB_NAME = 'daily-briefing';

/**
 * 일일 브리핑 배치 작업.
 * 매일 08:00(KST)에 실행되어 사용자별 일일 요약 브리핑을 생성한다.
 * - 오늘의 일정, 마감 임박 태스크, 어제 AI 대화 요약 등을 포함.
 */
@Injectable()
export class DailyBriefingJob {
  private readonly logger = new Logger(DailyBriefingJob.name);

  constructor(
    @InjectRepository(BatchJob)
    private readonly batchJobRepository: Repository<BatchJob>,
  ) {}

  /**
   * 매일 08:00 UTC에 실행.
   * BatchJob 레코드의 isEnabled 여부를 확인 후 실행한다.
   */
  @Cron('0 8 * * *', { name: DAILY_BRIEFING_JOB_NAME })
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
      where: { name: DAILY_BRIEFING_JOB_NAME },
    });

    if (jobRecord && !jobRecord.isEnabled) {
      this.logger.log('Daily briefing job is disabled, skipping');
      return;
    }

    try {
      this.logger.log('Daily briefing job started');

      // TODO(2026-03-22): AI Gateway 연동 후 실제 브리핑 생성 로직 구현
      // 1. 오늘의 일정 조회
      // 2. 마감 임박 태스크 조회
      // 3. 어제 AI 대화 요약
      // 4. 브리핑 메시지 생성 및 저장

      const durationMs = Date.now() - startTime;
      if (jobRecord) {
        jobRecord.recordExecution('SUCCESS', durationMs);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.log(`Daily briefing job completed in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (jobRecord) {
        jobRecord.recordExecution('FAILED', durationMs, errorMessage);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.error(`Daily briefing job failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
