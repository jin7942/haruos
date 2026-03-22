import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyBriefingJob, DAILY_BRIEFING_JOB_NAME } from './daily-briefing.job';
import { BatchJob } from '../entities/batch-job.entity';

describe('DailyBriefingJob', () => {
  let job: DailyBriefingJob;
  let batchJobRepo: jest.Mocked<Repository<BatchJob>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyBriefingJob,
        {
          provide: getRepositoryToken(BatchJob),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    job = module.get(DailyBriefingJob);
    batchJobRepo = module.get(getRepositoryToken(BatchJob));
  });

  it('비활성화된 작업이면 스킵한다', async () => {
    const record = Object.assign(new BatchJob(), {
      name: DAILY_BRIEFING_JOB_NAME,
      isEnabled: false,
    });
    batchJobRepo.findOne.mockResolvedValue(record);

    await job.execute();

    expect(batchJobRepo.save).not.toHaveBeenCalled();
  });

  it('활성화된 작업이면 실행하고 결과를 기록한다', async () => {
    const record = Object.assign(new BatchJob(), {
      name: DAILY_BRIEFING_JOB_NAME,
      isEnabled: true,
      lastRunAt: null,
      lastRunStatus: null,
      lastRunDurationMs: null,
      lastError: null,
    });
    batchJobRepo.findOne.mockResolvedValue(record);
    batchJobRepo.save.mockResolvedValue(record);

    await job.execute();

    expect(batchJobRepo.save).toHaveBeenCalled();
    expect(record.lastRunStatus).toBe('SUCCESS');
    expect(record.lastRunAt).toBeInstanceOf(Date);
    expect(record.lastRunDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('레코드가 없어도 에러 없이 실행된다', async () => {
    batchJobRepo.findOne.mockResolvedValue(null);

    await expect(job.execute()).resolves.toBeUndefined();
  });
});
