import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJobRunnerService } from './batch-job-runner.service';
import { BatchJob } from './entities/batch-job.entity';
import { DailyBriefingJob } from './jobs/daily-briefing.job';
import { ClickUpSyncJob } from './jobs/clickup-sync.job';
import { WatchFolderScanJob } from './jobs/watch-folder-scan.job';
import { EmbeddingRefreshJob } from './jobs/embedding-refresh.job';
import { WeeklyReportJob } from './jobs/weekly-report.job';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

describe('BatchJobRunnerService', () => {
  let service: BatchJobRunnerService;
  let batchJobRepo: jest.Mocked<Repository<BatchJob>>;
  let dailyBriefingJob: jest.Mocked<DailyBriefingJob>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchJobRunnerService,
        {
          provide: getRepositoryToken(BatchJob),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: DailyBriefingJob,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ClickUpSyncJob,
          useValue: { execute: jest.fn() },
        },
        {
          provide: WatchFolderScanJob,
          useValue: { execute: jest.fn() },
        },
        {
          provide: EmbeddingRefreshJob,
          useValue: { execute: jest.fn() },
        },
        {
          provide: WeeklyReportJob,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(BatchJobRunnerService);
    batchJobRepo = module.get(getRepositoryToken(BatchJob));
    dailyBriefingJob = module.get(DailyBriefingJob);
  });

  describe('triggerJob', () => {
    it('존재하지 않는 작업이면 ResourceNotFoundException', async () => {
      batchJobRepo.findOne.mockResolvedValue(null);

      await expect(service.triggerJob('invalid')).rejects.toThrow(ResourceNotFoundException);
    });

    it('등록된 작업을 찾아 실행한다', async () => {
      const job = Object.assign(new BatchJob(), {
        id: 'job-1',
        name: 'daily-briefing',
        isEnabled: true,
      });
      batchJobRepo.findOne
        .mockResolvedValueOnce(job)   // triggerJob 내부 첫 조회
        .mockResolvedValueOnce(job);  // 실행 후 재조회
      dailyBriefingJob.execute.mockResolvedValue(undefined);

      const result = await service.triggerJob('job-1');

      expect(dailyBriefingJob.execute).toHaveBeenCalled();
      expect(result.id).toBe('job-1');
    });
  });
});
