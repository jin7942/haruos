import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from './entities/batch-job.entity';
import { CreateBatchJobRequestDto } from './dto/create-batch-job.request.dto';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/**
 * 배치 스케줄러 서비스.
 * 반복 실행할 예약 작업의 생성, 일시정지, 재개, 조회를 담당한다.
 */
@Injectable()
export class BatchSchedulerService {
  private readonly logger = new Logger(BatchSchedulerService.name);

  constructor(
    @InjectRepository(BatchJob)
    private readonly batchJobRepository: Repository<BatchJob>,
  ) {}

  /**
   * 새 배치 작업을 생성한다.
   *
   * @param userId - 사용자 ID
   * @param dto - 배치 작업 생성 요청
   * @returns 생성된 배치 작업 엔티티
   */
  async createJob(userId: string, dto: CreateBatchJobRequestDto): Promise<BatchJob> {
    const job = this.batchJobRepository.create({
      userId,
      name: dto.name,
      cronExpression: dto.cronExpression,
      status: 'ACTIVE',
      payload: dto.payload ?? null,
    });

    const saved = await this.batchJobRepository.save(job);
    this.logger.log(`Batch job created: ${saved.id} (${saved.name})`);
    return saved;
  }

  /**
   * 배치 작업을 일시정지한다.
   *
   * @param jobId - 배치 작업 ID
   * @param userId - 사용자 ID (소유권 확인)
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   * @throws InvalidStateTransitionException 허용되지 않은 상태 전이인 경우
   */
  async pauseJob(jobId: string, userId: string): Promise<void> {
    const job = await this.findJobOrThrow(jobId, userId);
    job.pause();
    await this.batchJobRepository.save(job);
    this.logger.log(`Batch job paused: ${jobId}`);
  }

  /**
   * 일시정지된 배치 작업을 재개한다.
   *
   * @param jobId - 배치 작업 ID
   * @param userId - 사용자 ID (소유권 확인)
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   * @throws InvalidStateTransitionException 허용되지 않은 상태 전이인 경우
   */
  async resumeJob(jobId: string, userId: string): Promise<void> {
    const job = await this.findJobOrThrow(jobId, userId);
    job.resume();
    await this.batchJobRepository.save(job);
    this.logger.log(`Batch job resumed: ${jobId}`);
  }

  /**
   * 사용자의 배치 작업 목록을 조회한다.
   *
   * @param userId - 사용자 ID
   * @returns 배치 작업 목록 (최신순)
   */
  async getJobs(userId: string): Promise<BatchJob[]> {
    return this.batchJobRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 배치 작업을 실행한다 (stub).
   * 실제 작업 실행 로직은 향후 구현 예정.
   *
   * @param jobId - 배치 작업 ID
   * @param userId - 사용자 ID
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  async executeJob(jobId: string, userId: string): Promise<void> {
    const job = await this.findJobOrThrow(jobId, userId);
    job.recordExecution();
    await this.batchJobRepository.save(job);
    this.logger.log(`Batch job executed (stub): ${jobId}`);
  }

  /**
   * 배치 작업을 조회하고, 없으면 예외를 던진다.
   *
   * @param jobId - 배치 작업 ID
   * @param userId - 사용자 ID
   * @returns 배치 작업 엔티티
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  private async findJobOrThrow(jobId: string, userId: string): Promise<BatchJob> {
    const job = await this.batchJobRepository.findOne({
      where: { id: jobId, userId },
    });
    if (!job) {
      throw new ResourceNotFoundException('BatchJob', jobId);
    }
    return job;
  }
}
