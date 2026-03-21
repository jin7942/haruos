import { Injectable } from '@nestjs/common';
import { MetricCollectorPort } from '../ports/metric-collector.port';

/**
 * CloudWatch 메트릭 수집 어댑터.
 * AWS CloudWatch API를 통해 ECS/RDS/S3 메트릭을 수집한다.
 */
@Injectable()
export class CloudwatchAdapter extends MetricCollectorPort {
  /** @inheritdoc */
  async collectEcsMetrics(
    tenantId: string,
  ): Promise<{ metricType: string; value: number; unit: string }[]> {
    // AWS CloudWatch SDK 연동 시 구현
    throw new Error('Not implemented');
  }

  /** @inheritdoc */
  async collectRdsMetrics(
    tenantId: string,
  ): Promise<{ metricType: string; value: number; unit: string }[]> {
    // AWS CloudWatch SDK 연동 시 구현
    throw new Error('Not implemented');
  }

  /** @inheritdoc */
  async collectS3Metrics(
    tenantId: string,
  ): Promise<{ metricType: string; value: number; unit: string }[]> {
    // AWS CloudWatch SDK 연동 시 구현
    throw new Error('Not implemented');
  }
}
