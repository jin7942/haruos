import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { Conversation } from '../../haru/context/entities/conversation.entity';
import { Message } from '../../haru/context/entities/message.entity';
import { BatchJob } from '../../haru/batch/entities/batch-job.entity';

describe('StatsService', () => {
  let service: StatsService;

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getRawOne: jest.fn(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            count: jest.fn().mockResolvedValue(5),
          },
        },
        {
          provide: getRepositoryToken(Message),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(BatchJob),
          useValue: {
            count: jest.fn().mockResolvedValue(3),
          },
        },
      ],
    }).compile();

    service = module.get(StatsService);
  });

  describe('getDashboardStats', () => {
    it('대시보드 통계를 반환한다', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(100);
      mockQueryBuilder.getRawOne.mockResolvedValue({ total: '5000' });

      const result = await service.getDashboardStats('user-1');

      expect(result.totalConversations).toBe(5);
      expect(result.activeBatchJobs).toBe(3);
      expect(result.totalTokens).toBe(5000);
    });
  });

  describe('getAiUsageStats', () => {
    it('AI 사용량 통계를 반환한다', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { date: '2026-03-21', requests: '10', tokens: '2000' },
        { date: '2026-03-22', requests: '5', tokens: '1000' },
      ]);

      const result = await service.getAiUsageStats('user-1');

      expect(result.totalRequests).toBe(15);
      expect(result.totalTokens).toBe(3000);
      expect(result.averageTokensPerRequest).toBe(200);
      expect(result.dailyUsage).toHaveLength(2);
    });

    it('사용 기록이 없으면 0을 반환한다', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getAiUsageStats('user-1');

      expect(result.totalRequests).toBe(0);
      expect(result.averageTokensPerRequest).toBe(0);
    });
  });
});
