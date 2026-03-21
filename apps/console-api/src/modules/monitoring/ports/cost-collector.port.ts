/**
 * 비용 수집 포트.
 * AWS Cost Explorer 등 외부 비용 분석 서비스에서 비용 데이터를 수집한다.
 */
export abstract class CostCollectorPort {
  /**
   * 기간별 총 비용 수집.
   *
   * @param tenantId - 테넌트 ID
   * @param periodStart - 기간 시작일
   * @param periodEnd - 기간 종료일
   * @returns 서비스별 비용 목록
   */
  abstract collectCosts(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ service: string; cost: number; currency: string }[]>;

  /**
   * 서비스별 비용 상세 내역 수집.
   *
   * @param tenantId - 테넌트 ID
   * @param periodStart - 기간 시작일
   * @param periodEnd - 기간 종료일
   * @returns 서비스별 세부 비용 내역
   */
  abstract collectCostBreakdown(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ service: string; cost: number; currency: string }[]>;
}
