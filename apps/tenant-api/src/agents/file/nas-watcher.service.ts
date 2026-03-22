import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { NasOrganizerService } from './nas-organizer.service';
import { NAS_CONFIG } from './nas.config';

/**
 * NAS 워치독 서비스.
 * 주기적으로 미분류 파일을 스캔하고 자동 정리한다.
 * NAS_CONFIG.watcherEnabled가 false이면 비활성 상태로 유지.
 */
@Injectable()
export class NasWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NasWatcherService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(private readonly organizerService: NasOrganizerService) {}

  /** 모듈 초기화 시 워치독을 시작한다. */
  onModuleInit(): void {
    if (NAS_CONFIG.watcherEnabled) {
      this.start();
    } else {
      this.logger.log('NAS 워치독 비활성 (NAS_CONFIG.watcherEnabled = false)');
    }
  }

  /** 모듈 소멸 시 워치독을 중지한다. */
  onModuleDestroy(): void {
    this.stop();
  }

  /** 워치독을 시작한다. */
  start(): void {
    if (this.intervalRef) {
      this.logger.warn('워치독이 이미 실행 중입니다');
      return;
    }

    this.logger.log(`NAS 워치독 시작 (간격: ${NAS_CONFIG.watcherIntervalMs}ms)`);
    this.intervalRef = setInterval(() => this.poll(), NAS_CONFIG.watcherIntervalMs);
  }

  /** 워치독을 중지한다. */
  stop(): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
      this.logger.log('NAS 워치독 중지');
    }
  }

  /** 워치독 실행 여부를 반환한다. */
  isActive(): boolean {
    return this.intervalRef !== null;
  }

  /** 수동 폴링. 미분류 파일을 스캔하고 정리한다. */
  async poll(): Promise<void> {
    if (this.isRunning) {
      this.logger.debug('이전 폴링이 진행 중, 건너뜀');
      return;
    }

    this.isRunning = true;
    try {
      const result = await this.organizerService.organizeFiles();
      if (result.organized > 0 || result.extracted > 0) {
        this.logger.log(
          `워치독 폴링 결과: organized=${result.organized}, extracted=${result.extracted}`,
        );
      }
    } catch (error) {
      this.logger.error(`워치독 폴링 실패: ${(error as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
