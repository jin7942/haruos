import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { StatsService } from './stats.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.response.dto';
import { AiUsageStatsResponseDto } from './dto/ai-usage-stats.response.dto';

/**
 * 통계 컨트롤러.
 * 대시보드 통계 및 AI 사용량 조회 엔드포인트를 제공한다.
 */
@ApiTags('Stats')
@ApiBearerAuth()
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * 대시보드 통계를 조회한다.
   *
   * @param req - HTTP 요청 (JWT에서 userId 추출)
   * @returns 대시보드 통계
   */
  @Get('dashboard')
  @ApiOperation({ summary: '대시보드 통계 조회' })
  @ApiResponse({ status: 200, type: DashboardStatsResponseDto })
  async getDashboard(@Req() req: Request): Promise<DashboardStatsResponseDto> {
    const userId = (req as any).user.sub;
    return this.statsService.getDashboardStats(userId);
  }

  /**
   * AI 사용량 통계를 조회한다.
   *
   * @param req - HTTP 요청 (JWT에서 userId 추출)
   * @returns AI 사용량 통계
   */
  @Get('ai-usage')
  @ApiOperation({ summary: 'AI 사용량 통계 조회' })
  @ApiResponse({ status: 200, type: AiUsageStatsResponseDto })
  async getAiUsage(@Req() req: Request): Promise<AiUsageStatsResponseDto> {
    const userId = (req as any).user.sub;
    return this.statsService.getAiUsageStats(userId);
  }
}
