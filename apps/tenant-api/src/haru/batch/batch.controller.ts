import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BatchSchedulerService } from './batch-scheduler.service';
import { BatchJobResponseDto } from './dto/batch-job.response.dto';
import { BatchJobRunnerService } from './batch-job-runner.service';

/**
 * 배치 작업 관리 컨트롤러.
 * 배치 작업 목록 조회 및 수동 트리거 엔드포인트를 제공한다.
 */
@ApiTags('Batch')
@ApiBearerAuth()
@Controller('batch')
export class BatchController {
  constructor(
    private readonly batchScheduler: BatchSchedulerService,
    private readonly batchJobRunner: BatchJobRunnerService,
  ) {}

  /**
   * 등록된 배치 작업 목록을 조회한다.
   *
   * @returns 배치 작업 목록
   */
  @Get('jobs')
  @ApiOperation({ summary: '배치 작업 목록 조회' })
  @ApiResponse({ status: 200, type: [BatchJobResponseDto] })
  async getJobs(): Promise<BatchJobResponseDto[]> {
    const jobs = await this.batchScheduler.getJobs();
    return jobs.map(BatchJobResponseDto.from);
  }

  /**
   * 특정 배치 작업을 수동으로 즉시 실행한다.
   *
   * @param id - 배치 작업 ID
   * @returns 실행 후 갱신된 배치 작업 정보
   */
  @Post('jobs/:id/trigger')
  @ApiOperation({ summary: '배치 작업 수동 실행' })
  @ApiResponse({ status: 200, type: BatchJobResponseDto })
  async triggerJob(@Param('id') id: string): Promise<BatchJobResponseDto> {
    const job = await this.batchJobRunner.triggerJob(id);
    return BatchJobResponseDto.from(job);
  }
}
