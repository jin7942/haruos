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
        id: 'job-1', userId: 'user-1', name: '일일 리포트',
        cronExpression: '0 9 * * *', status: 'ACTIVE',
      } as BatchJob;
      batchJobRepo.create.mockReturnValue(job);
      batchJobRepo.save.mockResolvedValue(job);

      const result = await service.createJob('user-1', {
        name: '일일 리포트',
        cronExpression: '0 9 * * *',
      });

      expect(result.id).toBe('job-1');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('pauseJob', () => {
    it('ACTIVE 상태의 작업을 PAUSED로 전환한다', async () => {
      const job = Object.assign(new BatchJob(), {
        id: 'job-1', userId: 'user-1', status: 'ACTIVE',
      });
      batchJobRepo.findOne.mockResolvedValue(job);
      batchJobRepo.save.mockResolvedValue(job);

      await service.pauseJob('job-1', 'user-1');

      expect(job.status).toBe('PAUSED');
      expect(batchJobRepo.save).toHaveBeenCalled();
    });

    it('존재하지 않는 작업이면 ResourceNotFoundException을 던진다', async () => {
      batchJobRepo.findOne.mockResolvedValue(null);

      await expect(
        service.pauseJob('invalid', 'user-1'),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('resumeJob', () => {
    it('PAUSED 상태의 작업을 ACTIVE로 전환한다', async () => {
      const job = Object.assign(new BatchJob(), {
        id: 'job-1', userId: 'user-1', status: 'PAUSED',
      });
      batchJobRepo.findOne.mockResolvedValue(job);
      batchJobRepo.save.mockResolvedValue(job);

      await service.resumeJob('job-1', 'user-1');

      expect(job.status).toBe('ACTIVE');
    });
  });

  describe('getJobs', () => {
    it('사용자의 배치 작업 목록을 반환한다', async () => {
      const jobs = [{ id: 'job-1' }] as BatchJob[];
      batchJobRepo.find.mockResolvedValue(jobs);

      const result = await service.getJobs('user-1');

      expect(result).toHaveLength(1);
      expect(batchJobRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('executeJob', () => {
    it('작업 실행 시 lastRunAt을 갱신한다', async () => {
      const job = Object.assign(new BatchJob(), {
        id: 'job-1', userId: 'user-1', status: 'ACTIVE', lastRunAt: null,
      });
      batchJobRepo.findOne.mockResolvedValue(job);
      batchJobRepo.save.mockResolvedValue(job);

      await service.executeJob('job-1', 'user-1');

      expect(job.lastRunAt).toBeInstanceOf(Date);
    });
  });
});
