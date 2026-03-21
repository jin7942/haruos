/**
 * 비용 수집 포트.
 */
export abstract class CostCollectorPort {
  /** 테넌트 비용 수집 */
  abstract collectCosts(tenantId: string, periodStart: Date, periodEnd: Date): Promise<{ service: string; cost: number; currency: string }[]>;
}
