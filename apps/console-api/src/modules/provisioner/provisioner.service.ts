import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, interval, switchMap, takeWhile, map, startWith, distinctUntilChanged } from 'rxjs';
import { TerraformPort } from './ports/terraform.port';
import { AnsiblePort } from './ports/ansible.port';
import { DnsPort } from './ports/dns.port';
import { ProvisioningJobEntity } from './entities/provisioning-job.entity';
import { ProvisioningLogEntity } from './entities/provisioning-log.entity';
import { TenantInfraEntity } from './entities/tenant-infra.entity';
import { ProvisioningJobResponseDto } from './dto/provisioning-job.response.dto';
import { ProvisioningLogResponseDto } from './dto/provisioning-log.response.dto';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/** 프로비저닝 단계 정의 */
const PROVISIONING_STEPS = ['TERRAFORM_PLAN', 'TERRAFORM_APPLY', 'ANSIBLE_SETUP', 'DNS_SETUP', 'HEALTH_CHECK'] as const;

/**
 * ProvisionerFacade - 프로비저닝 전체 오케스트레이션.
 * Terraform, Ansible, DNS 포트를 조합하여 테넌트 인프라를 구성한다.
 *
 * 프로비저닝 흐름:
 * 1. Terraform plan/apply로 AWS 인프라 생성 (VPC, RDS, ECS, ALB, S3)
 * 2. Ansible playbook으로 애플리케이션 설정
 * 3. DNS 레코드 생성
 * 4. 헬스체크로 정상 동작 확인
 */
@Injectable()
export class ProvisionerFacade {
  private readonly logger = new Logger(ProvisionerFacade.name);

  constructor(
    @InjectRepository(ProvisioningJobEntity)
    private readonly jobRepository: Repository<ProvisioningJobEntity>,
    @InjectRepository(ProvisioningLogEntity)
    private readonly logRepository: Repository<ProvisioningLogEntity>,
    @InjectRepository(TenantInfraEntity)
    private readonly infraRepository: Repository<TenantInfraEntity>,
    private readonly terraform: TerraformPort,
    private readonly ansible: AnsiblePort,
    private readonly dns: DnsPort,
  ) {}

  /**
   * 테넌트 프로비저닝 시작.
   * 작업을 생성하고 비동기로 인프라 구성 파이프라인을 실행한다.
   *
   * @param tenantId - 프로비저닝 대상 테넌트 ID
   * @param variables - Terraform/Ansible에 전달할 변수 (region, slug 등)
   * @returns 생성된 프로비저닝 작업 정보
   */
  async startProvisioning(
    tenantId: string,
    variables: Record<string, string>,
  ): Promise<ProvisioningJobResponseDto> {
    const job = ProvisioningJobEntity.create(tenantId, PROVISIONING_STEPS.length);
    await this.jobRepository.save(job);

    // 비동기로 프로비저닝 파이프라인 실행
    this.executeProvisioning(job, variables).catch((err) => {
      this.logger.error(`Provisioning failed for tenant ${tenantId}: ${err.message}`, err.stack);
    });

    return ProvisioningJobResponseDto.from(job);
  }

  /**
   * 프로비저닝 작업 상태 조회.
   *
   * @param tenantId - 테넌트 ID
   * @returns 가장 최근 프로비저닝 작업 정보
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  async getStatus(tenantId: string): Promise<ProvisioningJobResponseDto> {
    const job = await this.jobRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    if (!job) {
      throw new ResourceNotFoundException('ProvisioningJob', tenantId);
    }
    return ProvisioningJobResponseDto.from(job);
  }

  /**
   * 프로비저닝 작업의 단계별 로그 조회.
   *
   * @param tenantId - 테넌트 ID
   * @returns 단계별 로그 목록
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  async getLogs(tenantId: string): Promise<ProvisioningLogResponseDto[]> {
    const job = await this.jobRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    if (!job) {
      throw new ResourceNotFoundException('ProvisioningJob', tenantId);
    }

    const logs = await this.logRepository.find({
      where: { jobId: job.id },
      order: { createdAt: 'ASC' },
    });
    return logs.map(ProvisioningLogResponseDto.from);
  }

  /**
   * 실패한 프로비저닝 롤백.
   * Terraform destroy를 실행하여 생성된 인프라를 제거한다.
   *
   * @param tenantId - 테넌트 ID
   * @returns 롤백 처리 중인 작업 정보
   * @throws ResourceNotFoundException 작업이 존재하지 않는 경우
   */
  async rollback(tenantId: string): Promise<ProvisioningJobResponseDto> {
    const job = await this.jobRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    if (!job) {
      throw new ResourceNotFoundException('ProvisioningJob', tenantId);
    }

    job.rollback();
    await this.jobRepository.save(job);

    this.executeRollback(job, tenantId).catch((err) => {
      this.logger.error(`Rollback failed for tenant ${tenantId}: ${err.message}`, err.stack);
    });

    return ProvisioningJobResponseDto.from(job);
  }

  /**
   * 프로비저닝 상태를 SSE 스트리밍으로 전송한다.
   * 2초 간격으로 DB를 폴링하여 상태 변경을 감지한다.
   * 작업이 완료/실패되면 스트림을 종료한다.
   *
   * @param tenantId - 테넌트 ID
   * @returns SSE MessageEvent Observable
   */
  streamStatus(tenantId: string): Observable<MessageEvent> {
    const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'ROLLED_BACK'];

    return new Observable<MessageEvent>((subscriber) => {
      let lastStatus = '';
      let lastCompletedSteps = -1;

      const sub = interval(2000)
        .pipe(startWith(0))
        .subscribe(async () => {
          try {
            const job = await this.jobRepository.findOne({
              where: { tenantId },
              order: { createdAt: 'DESC' },
            });

            if (!job) {
              subscriber.next(
                new MessageEvent('error', {
                  data: JSON.stringify({ message: 'Provisioning job not found' }),
                }),
              );
              subscriber.complete();
              sub.unsubscribe();
              return;
            }

            // 상태 변경 또는 단계 진행 시에만 이벤트 전송
            if (job.status !== lastStatus || job.completedSteps !== lastCompletedSteps) {
              lastStatus = job.status;
              lastCompletedSteps = job.completedSteps;

              const dto = ProvisioningJobResponseDto.from(job);
              subscriber.next(
                new MessageEvent('status', { data: JSON.stringify(dto) }),
              );

              // 최근 로그도 함께 전송
              const logs = await this.logRepository.find({
                where: { jobId: job.id },
                order: { createdAt: 'DESC' },
                take: 1,
              });
              if (logs.length > 0) {
                subscriber.next(
                  new MessageEvent('log', {
                    data: JSON.stringify(ProvisioningLogResponseDto.from(logs[0])),
                  }),
                );
              }

              // 터미널 상태이면 완료
              if (TERMINAL_STATUSES.includes(job.status)) {
                subscriber.next(
                  new MessageEvent('done', {
                    data: JSON.stringify({ status: job.status }),
                  }),
                );
                subscriber.complete();
                sub.unsubscribe();
              }
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(`SSE stream error for tenant ${tenantId}: ${message}`);
            subscriber.next(
              new MessageEvent('error', { data: JSON.stringify({ message }) }),
            );
            subscriber.complete();
            sub.unsubscribe();
          }
        });

      return () => sub.unsubscribe();
    });
  }

  /**
   * 프로비저닝 파이프라인 실행 (내부).
   * 각 단계를 순차 실행하며 로그를 기록한다.
   */
  private async executeProvisioning(
    job: ProvisioningJobEntity,
    variables: Record<string, string>,
  ): Promise<void> {
    job.start();
    await this.jobRepository.save(job);

    try {
      // 1. Terraform Plan
      await this.executeStep(job, 'TERRAFORM_PLAN', async () => {
        await this.terraform.plan(job.tenantId, variables);
      });

      // 2. Terraform Apply
      await this.executeStep(job, 'TERRAFORM_APPLY', async () => {
        const output = await this.terraform.apply(job.tenantId, variables);
        job.terraformStateKey = `tenants/${job.tenantId}/terraform.tfstate`;
        await this.jobRepository.save(job);

        // 인프라 정보 저장
        const infra = TenantInfraEntity.create(job.tenantId);
        await this.infraRepository.save(infra);
      });

      // 3. Ansible Setup
      await this.executeStep(job, 'ANSIBLE_SETUP', async () => {
        await this.ansible.runPlaybook('setup-app', variables);
      });

      // 4. DNS Setup
      await this.executeStep(job, 'DNS_SETUP', async () => {
        const domain = `${variables['slug']}.haruos.app`;
        await this.dns.createRecord(domain, variables['alb_dns_name'] || '');
      });

      // 5. Health Check
      await this.executeStep(job, 'HEALTH_CHECK', async () => {
        const domain = `${variables['slug']}.haruos.app`;
        await this.dns.verifyDns(domain);
      });

      job.complete();
      await this.jobRepository.save(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      job.fail(message);
      await this.jobRepository.save(job);
    }
  }

  /**
   * 개별 프로비저닝 단계 실행 및 로그 기록.
   */
  private async executeStep(
    job: ProvisioningJobEntity,
    step: string,
    action: () => Promise<void>,
  ): Promise<void> {
    const startLog = ProvisioningLogEntity.of(job.id, step, 'STARTED', `${step} started`);
    await this.logRepository.save(startLog);

    try {
      await action();

      job.advanceStep(step);
      await this.jobRepository.save(job);

      const completeLog = ProvisioningLogEntity.of(job.id, step, 'COMPLETED', `${step} completed`);
      await this.logRepository.save(completeLog);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const failLog = ProvisioningLogEntity.of(job.id, step, 'FAILED', message);
      await this.logRepository.save(failLog);
      throw error;
    }
  }

  /**
   * 롤백 파이프라인 실행 (내부).
   */
  private async executeRollback(job: ProvisioningJobEntity, tenantId: string): Promise<void> {
    try {
      await this.dns.deleteRecord(`${tenantId}.haruos.app`);
      await this.terraform.destroy(tenantId);
      await this.infraRepository.delete({ tenantId });

      job.completeRollback();
      await this.jobRepository.save(job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Rollback execution failed: ${message}`, (error as Error).stack);
    }
  }
}
