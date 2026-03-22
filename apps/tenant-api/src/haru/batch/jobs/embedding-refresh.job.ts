import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from '../entities/batch-job.entity';

/** 배치 작업 이름 상수. */
export const EMBEDDING_REFRESH_JOB_NAME = 'embedding-refresh';

/**
 * 임베딩 갱신 배치 작업.
 * 매일 02:00에 실행되어 변경된 문서의 벡터 임베딩을 갱신한다.
 * - 수정/삭제된 문서의 기존 임베딩 무효화.
 * - 새로 추가된 문서의 임베딩 생성.
 * - pgvector 인덱스 최적화(VACUUM).
 */
@Injectable()
export class EmbeddingRefreshJob {
  private readonly logger = new Logger(EmbeddingRefreshJob.name);

  constructor(
    @InjectRepository(BatchJob)
    private readonly batchJobRepository: Repository<BatchJob>,
  ) {}

  /**
   * 매일 02:00 UTC에 실행.
   */
  @Cron('0 2 * * *', { name: EMBEDDING_REFRESH_JOB_NAME })
  async handleCron(): Promise<void> {
    await this.execute();
  }

  /**
   * 수동 트리거 또는 cron에서 호출되는 실행 로직.
   * BatchJob 레코드가 비활성화 상태이면 스킵한다.
   */
  async execute(): Promise<void> {
    const startTime = Date.now();
    const jobRecord = await this.batchJobRepository.findOne({
      where: { name: EMBEDDING_REFRESH_JOB_NAME },
    });

    if (jobRecord && !jobRecord.isEnabled) {
      this.logger.log('Embedding refresh job is disabled, skipping');
      return;
    }

    try {
      this.logger.log('Embedding refresh job started');

      // TODO(2026-03-22): KnowledgeAgent/VectorSearchService 연동 후 구현
      // 1. 마지막 갱신 이후 변경된 문서 목록 조회
      // 2. 삭제된 문서의 임베딩 제거
      // 3. 변경된 문서의 임베딩 재생성 (chunk → embed → upsert)
      // 4. 새 문서의 임베딩 생성
      // 5. pgvector 인덱스 VACUUM 실행

      const durationMs = Date.now() - startTime;
      if (jobRecord) {
        jobRecord.recordExecution('SUCCESS', durationMs);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.log(`Embedding refresh job completed in ${durationMs}ms`);
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (jobRecord) {
        jobRecord.recordExecution('FAILED', durationMs, errorMessage);
        await this.batchJobRepository.save(jobRecord);
      }
      this.logger.error(`Embedding refresh job failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }
  }
}
