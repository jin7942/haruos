import { ApiProperty } from '@nestjs/swagger';

/** AI 사용량 통계 응답 DTO. */
export class AiUsageStatsResponseDto {
  @ApiProperty({ description: '총 AI 요청 수' })
  totalRequests: number;

  @ApiProperty({ description: '총 토큰 사용량' })
  totalTokens: number;

  @ApiProperty({ description: '평균 토큰/요청' })
  averageTokensPerRequest: number;

  @ApiProperty({ description: '일별 사용량', type: [Object] })
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
  }>;

  static of(data: {
    totalRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
    dailyUsage: Array<{ date: string; requests: number; tokens: number }>;
  }): AiUsageStatsResponseDto {
    const dto = new AiUsageStatsResponseDto();
    Object.assign(dto, data);
    return dto;
  }
}
