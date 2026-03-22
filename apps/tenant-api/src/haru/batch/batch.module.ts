import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BatchSchedulerService } from './batch-scheduler.service';
import { BatchJobRunnerService } from './batch-job-runner.service';
import { BatchController } from './batch.controller';
import { BatchJob } from './entities/batch-job.entity';
import { DailyBriefingJob } from './jobs/daily-briefing.job';
import { ClickUpSyncJob } from './jobs/clickup-sync.job';
import { WatchFolderScanJob } from './jobs/watch-folder-scan.job';
import { EmbeddingRefreshJob } from './jobs/embedding-refresh.job';
import { WeeklyReportJob } from './jobs/weekly-report.job';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([BatchJob]),
  ],
  controllers: [BatchController],
  providers: [
    BatchSchedulerService,
    BatchJobRunnerService,
    DailyBriefingJob,
    ClickUpSyncJob,
    WatchFolderScanJob,
    EmbeddingRefreshJob,
    WeeklyReportJob,
  ],
  exports: [BatchSchedulerService],
})
export class BatchModule {}
