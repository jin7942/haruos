import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchSchedulerService } from './batch-scheduler.service';
import { BatchJob } from './entities/batch-job.entity';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

describe('BatchSchedulerService', () => {
  let service: BatchSchedulerService;
  let batchJobRepo: jest.Mocked<Repository<BatchJob>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchSchedulerService,
        {
          provide: getRepositoryToken(BatchJob),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(BatchSchedulerService);
    batchJobRepo = module.get(getRepositoryToken(BatchJob));
  });

  describe('createJob', () => {
    it('배치 작업을 생성한다', async () => {
      const job = {
        id: 'job-1', name: '일일 리포트',
        cronExpression: '0 9 * * *', isEnabled: true,
      } as BatchJob;
      batchJobRepo.create.mockReturnValue(job);
      batchJobRepo.save.mockResolvedValue(job);

      const result = await service.createJob({
        name: '일일 리포트',
        cronExpression: '0 9 * * *',
      });

      expect(result.id).toBe('job-1');
      expect(result.isEnabled).toBe(true);
    });
  });

  describe('disableJob', () => {
    it('작업을 비활성화한다', async () => {
      const job = Object.assign(new BatchJob(), {
        id: 'job-1', isEnabled: true,
      });
      batchJobRepo.findOne.mockResolvedValue(job);
      batchJobRepo.save.mockResolvedValue(job);

      await service.disableJob('job-1');

      expect(job.isEnabled).toBe(false);
      expect(batchJobRepo.save).toHaveBeenCalled();
    });

    it('존재하지 않는 작업이면 ResourceNotFoundException을 던진다', async () => {
      batchJobRepo.findOne.mockResolvedValue(null);

      await expect(
        service.disableJob('invalid'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('enableJob', () => {
    it('비활성화된 작업을 활성화한다', async () => {
      const job = Object.assign(new BatchJob(), {
        id: 'job-1', isEnabled: false,
      });
      batchJobRepo.findOne.mockResolvedValue(job);
      batchJobRepo.save.mockResolvedValue(job);

      await service.enableJob('job-1');

      expect(job.isEnabled).toBe(true);
    });
  });

  describe('getJobs', () => {
    it('배치 작업 목록을 반환한다', async () => {
      const jobs = [{ id: 'job-1' }] as BatchJob[];
      batchJobRepo.find.mockResolvedValue(jobs);

      const result = await service.getJobs();

      expect(result).toHaveLength(1);
      expect(batchJobRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });
  });
});
