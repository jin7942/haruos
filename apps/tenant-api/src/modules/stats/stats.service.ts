import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Conversation } from '../../haru/context/entities/conversation.entity';
import { Message } from '../../haru/context/entities/message.entity';
import { BatchJob } from '../../haru/batch/entities/batch-job.entity';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.response.dto';
import { AiUsageStatsResponseDto } from './dto/ai-usage-stats.response.dto';

/**
 * 통계 서비스.
 * 대시보드용 집계 데이터와 AI 사용량 통계를 제공한다.
 */
@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(BatchJob)
    private readonly batchJobRepository: Repository<BatchJob>,
  ) {}

  /**
   * 대시보드 통계를 반환한다.
   *
   * @param userId - 사용자 ID
   * @returns 대시보드 통계 DTO
   */
  async getDashboardStats(userId: string): Promise<DashboardStatsResponseDto> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalConversations, totalMessages, tokenResult, todayMessages, activeBatchJobs] =
      await Promise.all([
        this.conversationRepository.count({ where: { userId } }),
        this.messageRepository
          .createQueryBuilder('m')
          .innerJoin('m.conversation', 'c')
          .where('c.userId = :userId', { userId })
          .getCount(),
        this.messageRepository
          .createQueryBuilder('m')
          .select('COALESCE(SUM(m.tokenCount), 0)', 'total')
          .innerJoin('m.conversation', 'c')
          .where('c.userId = :userId', { userId })
          .getRawOne(),
        this.messageRepository
          .createQueryBuilder('m')
          .innerJoin('m.conversation', 'c')
          .where('c.userId = :userId', { userId })
          .andWhere('m.createdAt >= :todayStart', { todayStart })
          .getCount(),
        this.batchJobRepository.count({ where: { isEnabled: true } }),
      ]);

    return DashboardStatsResponseDto.of({
      totalConversations,
      totalMessages,
      totalTokens: Number(tokenResult?.total ?? 0),
      todayMessages,
      activeBatchJobs,
      totalDocuments: 0, // 문서 모듈 연동 후 실제 값으로 대체
    });
  }

  /**
   * AI 사용량 통계를 반환한다.
   * 최근 7일간의 일별 요청 수와 토큰 사용량을 집계한다.
   *
   * @param userId - 사용자 ID
   * @returns AI 사용량 통계 DTO
   */
  async getAiUsageStats(userId: string): Promise<AiUsageStatsResponseDto> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // assistant 역할 메시지 = AI 응답
    const aiMessages = await this.messageRepository
      .createQueryBuilder('m')
      .select([
        'DATE(m.created_at) as date',
        'COUNT(*) as requests',
        'COALESCE(SUM(m.token_count), 0) as tokens',
      ])
      .innerJoin('m.conversation', 'c')
      .where('c.userId = :userId', { userId })
      .andWhere('m.role = :role', { role: 'assistant' })
      .andWhere('m.createdAt >= :since', { since: sevenDaysAgo })
      .groupBy('DATE(m.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const dailyUsage = aiMessages.map((row) => ({
      date: String(row.date),
      requests: Number(row.requests),
      tokens: Number(row.tokens),
    }));

    const totalRequests = dailyUsage.reduce((sum, d) => sum + d.requests, 0);
    const totalTokens = dailyUsage.reduce((sum, d) => sum + d.tokens, 0);

    return AiUsageStatsResponseDto.of({
      totalRequests,
      totalTokens,
      averageTokensPerRequest: totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0,
      dailyUsage,
    });
  }
}
