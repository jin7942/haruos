import { Injectable } from '@nestjs/common';
import { CostCollectorPort } from '../ports/cost-collector.port';

@Injectable()
export class CostExplorerAdapter extends CostCollectorPort {
  async collectCosts(tenantId: string, periodStart: Date, periodEnd: Date): Promise<{ service: string; cost: number; currency: string }[]> {
    throw new Error('Not implemented');
  }
}
