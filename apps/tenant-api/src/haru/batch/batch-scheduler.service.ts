import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from './entities/batch-job.entity';
import { CreateBatchJobRequestDto } from './dto/create-batch-job.request.dto';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/**
 * 배치 스케줄러 서비스.
 * 반복 실행할 예약 작업의 생성, 비활성화, 활성화, 조회를 담당한다.
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
   * @param dto - 배치 작업 생성 요청
   * @returns 생성된 배치 작업 엔티티
   */
  async createJob(dto: CreateBatchJobRequestDto): Promise<BatchJob> {
    const job = this.batchJobRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      cronExpression: dto.cronExpression,
      isEnabled: true,
    });

    const saved = await this.batchJobRepository.save(job);
    this.logger.log(`Batch job created: ${saved.id} (${saved.name})`);
    return saved;
  }

  /**
   * 배치 작업을 비활성화한다.
   *
   * @param jobId - 배치 작업 ID
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  async disableJob(jobId: string): Promise<void> {
    const job = await this.findJobOrThrow(jobId);
    job.disable();
    await this.batchJobRepository.save(job);
    this.logger.log(`Batch job disabled: ${jobId}`);
  }

  /**
   * 비활성화된 배치 작업을 활성화한다.
   *
   * @param jobId - 배치 작업 ID
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  async enableJob(jobId: string): Promise<void> {
    const job = await this.findJobOrThrow(jobId);
    job.enable();
    await this.batchJobRepository.save(job);
    this.logger.log(`Batch job enabled: ${jobId}`);
  }

  /**
   * 배치 작업 목록을 조회한다.
   *
   * @returns 배치 작업 목록 (최신순)
   */
  async getJobs(): Promise<BatchJob[]> {
    return this.batchJobRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 배치 작업을 조회하고, 없으면 예외를 던진다.
   *
   * @param jobId - 배치 작업 ID
   * @returns 배치 작업 엔티티
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  private async findJobOrThrow(jobId: string): Promise<BatchJob> {
    const job = await this.batchJobRepository.findOne({
      where: { id: jobId },
    });
    if (!job) {
      throw new ResourceNotFoundException('BatchJob', jobId);
    }
    return job;
  }
}
