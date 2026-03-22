import { Test, TestingModule } from '@nestjs/testing';
import { BatchController } from './batch.controller';
import { BatchSchedulerService } from './batch-scheduler.service';
import { BatchJobRunnerService } from './batch-job-runner.service';
import { BatchJob } from './entities/batch-job.entity';

describe('BatchController', () => {
  let controller: BatchController;
  let scheduler: jest.Mocked<BatchSchedulerService>;
  let runner: jest.Mocked<BatchJobRunnerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BatchController],
      providers: [
        {
          provide: BatchSchedulerService,
          useValue: { getJobs: jest.fn() },
        },
        {
          provide: BatchJobRunnerService,
          useValue: { triggerJob: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(BatchController);
    scheduler = module.get(BatchSchedulerService);
    runner = module.get(BatchJobRunnerService);
  });

  describe('getJobs', () => {
    it('배치 작업 목록을 DTO로 변환하여 반환한다', async () => {
      const job = Object.assign(new BatchJob(), {
        id: 'job-1',
        name: 'daily-briefing',
        description: '일일 브리핑',
        cronExpression: '0 8 * * *',
        isEnabled: true,
        lastRunAt: null,
        lastRunStatus: null,
        createdAt: new Date('2026-03-22T00:00:00Z'),
        updatedAt: new Date('2026-03-22T00:00:00Z'),
      });
      scheduler.getJobs.mockResolvedValue([job]);

      const result = await controller.getJobs();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('job-1');
      expect(result[0].name).toBe('daily-briefing');
    });
  });

  describe('triggerJob', () => {
    it('배치 작업을 수동 실행하고 결과를 반환한다', async () => {
      const job = Object.assign(new BatchJob(), {
        id: 'job-1',
        name: 'daily-briefing',
        description: null,
        cronExpression: '0 8 * * *',
        isEnabled: true,
        lastRunAt: new Date(),
        lastRunStatus: 'SUCCESS',
        lastRunDurationMs: 150,
        lastError: null,
        createdAt: new Date('2026-03-22T00:00:00Z'),
        updatedAt: new Date('2026-03-22T00:00:00Z'),
      });
      runner.triggerJob.mockResolvedValue(job);

      const result = await controller.triggerJob('job-1');

      expect(runner.triggerJob).toHaveBeenCalledWith('job-1');
      expect(result.lastRunStatus).toBe('SUCCESS');
    });
  });
});
