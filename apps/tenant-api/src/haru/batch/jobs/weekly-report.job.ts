import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from '../entities/batch-job.entity';

/** 배치 작업 이름 상수. */
export const WEEKLY_REPORT_JOB_NAME = 'weekly-report';

/**
 * 주간 리포트 배치 작업.
 * 매주 월요일 09:00에 실행되어 지난주의 업무 요약 리포트를 생성한다.
 * - 완료된 태스크 수, AI 사용량, 주요 활동 요약 등을 포함.
 */
@Injectable()
export class WeeklyReportJob {
  private readonly logger = new Logger(WeeklyReportJob.name);

  constructor(
    @InjectRepository(BatchJob)
    private readonly batchJobRepository: Repository<BatchJob>,
  ) {}

  /**
   * 매주 월요일 09:00 UTC에 실행.
   */
  @Cron('0 9 * * 1', { name: WEEKLY_REPORT_JOB_NAME })
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
      where: { name: WEEKLY_REPORT_JOB_NAME },
    });

    if (jobRecord && !jobRecord.isEnabled) {
      this.logger.log('Weekly report job is disabled, skipping');
      return;
    }

    try {
      this.logger.log('Weekly report job started');

      // TODO(2026-03-22): AI Gateway + Stats 연동 후 실제 리포트 생성 구현
      // 1. 지난주 완료된 태스크 집계
      // 2. AI 대화 사용량 집계 (토큰, 요청 수)
      // 3. 주요 활동 요약 (AI로 생성)
      // 4. 리포트 저장 및 알림

      const durationMs = Date.now() - startTime;
      if (jobRecord) {
        jobRecord.recordExecution('SUCCESS', durationMs);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.log(`Weekly report job completed in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (jobRecord) {
        jobRecord.recordExecution('FAILED', durationMs, errorMessage);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.error(`Weekly report job failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
