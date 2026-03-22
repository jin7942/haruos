import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from './entities/batch-job.entity';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';
import { DailyBriefingJob, DAILY_BRIEFING_JOB_NAME } from './jobs/daily-briefing.job';
import { ClickUpSyncJob, CLICKUP_SYNC_JOB_NAME } from './jobs/clickup-sync.job';
import { WatchFolderScanJob, WATCH_FOLDER_SCAN_JOB_NAME } from './jobs/watch-folder-scan.job';
import { EmbeddingRefreshJob, EMBEDDING_REFRESH_JOB_NAME } from './jobs/embedding-refresh.job';
import { WeeklyReportJob, WEEKLY_REPORT_JOB_NAME } from './jobs/weekly-report.job';

/**
 * 배치 작업 실행기.
 * 배치 작업 ID로 해당 작업을 찾아 수동 실행한다.
 */
@Injectable()
export class BatchJobRunnerService {
  private readonly logger = new Logger(BatchJobRunnerService.name);

  /** 작업 이름 → 실행 가능 객체 매핑. */
  private readonly jobMap: Record<string, { execute: () => Promise<void> }>;

  constructor(
    @InjectRepository(BatchJob)
    private readonly batchJobRepository: Repository<BatchJob>,
    private readonly dailyBriefingJob: DailyBriefingJob,
    private readonly clickUpSyncJob: ClickUpSyncJob,
    private readonly watchFolderScanJob: WatchFolderScanJob,
    private readonly embeddingRefreshJob: EmbeddingRefreshJob,
    private readonly weeklyReportJob: WeeklyReportJob,
  ) {
    this.jobMap = {
      [DAILY_BRIEFING_JOB_NAME]: dailyBriefingJob,
      [CLICKUP_SYNC_JOB_NAME]: clickUpSyncJob,
      [WATCH_FOLDER_SCAN_JOB_NAME]: watchFolderScanJob,
      [EMBEDDING_REFRESH_JOB_NAME]: embeddingRefreshJob,
      [WEEKLY_REPORT_JOB_NAME]: weeklyReportJob,
    };
  }

  /**
   * 배치 작업을 수동으로 즉시 실행한다.
   * isEnabled 여부와 무관하게 강제 실행한다.
   *
   * @param jobId - 배치 작업 ID
   * @returns 실행 후 갱신된 BatchJob 엔티티
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  async triggerJob(jobId: string): Promise<BatchJob> {
    const job = await this.batchJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new ResourceNotFoundException('BatchJob', jobId);
    }

    const runner = this.jobMap[job.name];
    if (!runner) {
      this.logger.warn(`No runner registered for job: ${job.name}`);
      job.recordExecution('FAILED', 0, `No runner registered for job: ${job.name}`);
      await this.batchJobRepository.save(job);
      return job;
    }

    this.logger.log(`Manually triggering job: ${job.name} (${jobId})`);
    await runner.execute();

    // execute()가 이미 recordExecution을 호출하므로 최신 상태를 다시 조회
    const updated = await this.batchJobRepository.findOne({ where: { id: jobId } });
    return updated ?? job;
  }
}
