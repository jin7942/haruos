/**
 * 메트릭 수집 포트.
 */
export abstract class MetricCollectorPort {
  /** 테넌트 메트릭 수집 */
  abstract collectMetrics(tenantId: string): Promise<{ metricType: string; value: number; unit: string }[]>;
}
