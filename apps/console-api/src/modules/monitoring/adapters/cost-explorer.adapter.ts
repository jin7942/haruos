import { Injectable } from '@nestjs/common';
import { CostCollectorPort } from '../ports/cost-collector.port';

/**
 * AWS Cost Explorer 비용 수집 어댑터.
 * Cost Explorer API를 통해 테넌트별 AWS 비용을 수집한다.
 */
@Injectable()
export class CostExplorerAdapter extends CostCollectorPort {
  /** @inheritdoc */
  async collectCosts(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ service: string; cost: number; currency: string }[]> {
    // AWS Cost Explorer SDK 연동 시 구현
    throw new Error('Not implemented');
  }

  /** @inheritdoc */
  async collectCostBreakdown(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ service: string; cost: number; currency: string }[]> {
    // AWS Cost Explorer SDK 연동 시 구현
    throw new Error('Not implemented');
  }
}
