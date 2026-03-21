/**
 * 메트릭 수집 포트.
 * CloudWatch 등 외부 모니터링 서비스에서 인프라 메트릭을 수집한다.
 */
export abstract class MetricCollectorPort {
  /**
   * ECS 컨테이너 메트릭 수집 (CPU, Memory).
   *
   * @param tenantId - 테넌트 ID
   * @returns ECS CPU/Memory 사용률
   */
  abstract collectEcsMetrics(
    tenantId: string,
  ): Promise<{ metricType: string; value: number; unit: string }[]>;

  /**
   * RDS 데이터베이스 메트릭 수집 (CPU, Storage, Connections).
   *
   * @param tenantId - 테넌트 ID
   * @returns RDS 관련 메트릭
   */
  abstract collectRdsMetrics(
    tenantId: string,
  ): Promise<{ metricType: string; value: number; unit: string }[]>;

  /**
   * S3 스토리지 메트릭 수집 (버킷 크기, 객체 수).
   *
   * @param tenantId - 테넌트 ID
   * @returns S3 관련 메트릭
   */
  abstract collectS3Metrics(
    tenantId: string,
  ): Promise<{ metricType: string; value: number; unit: string }[]>;
}
