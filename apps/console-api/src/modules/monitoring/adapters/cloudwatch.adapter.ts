import { Injectable } from '@nestjs/common';
import { MetricCollectorPort } from '../ports/metric-collector.port';

@Injectable()
export class CloudwatchAdapter extends MetricCollectorPort {
  async collectMetrics(tenantId: string): Promise<{ metricType: string; value: number; unit: string }[]> {
    throw new Error('Not implemented');
  }
}
