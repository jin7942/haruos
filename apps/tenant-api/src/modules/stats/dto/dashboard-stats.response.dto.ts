import { ApiProperty } from '@nestjs/swagger';

/** 대시보드 통계 응답 DTO. */
export class DashboardStatsResponseDto {
  @ApiProperty({ description: '총 대화 수' })
  totalConversations: number;

  @ApiProperty({ description: '총 메시지 수' })
  totalMessages: number;

  @ApiProperty({ description: '총 토큰 사용량' })
  totalTokens: number;

  @ApiProperty({ description: '오늘 메시지 수' })
  todayMessages: number;

  @ApiProperty({ description: '활성 배치 작업 수' })
  activeBatchJobs: number;

  @ApiProperty({ description: '총 문서 수' })
  totalDocuments: number;

  static of(data: {
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    todayMessages: number;
    activeBatchJobs: number;
    totalDocuments: number;
  }): DashboardStatsResponseDto {
    const dto = new DashboardStatsResponseDto();
    Object.assign(dto, data);
    return dto;
  }
}
