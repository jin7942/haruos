/**
 * Terraform 실행 포트.
 * 테넌트 인프라의 IaC 생성/변경/삭제를 추상화한다.
 */
export abstract class TerraformPort {
  /**
   * Terraform plan 실행. 변경 사항을 미리 확인한다.
   *
   * @param tenantId - 대상 테넌트 ID
   * @param variables - Terraform 변수 (리전, 인스턴스 타입 등)
   * @returns plan 실행 결과 출력
   */
  abstract plan(tenantId: string, variables: Record<string, string>): Promise<string>;

  /**
   * Terraform apply 실행. 인프라를 실제 생성/변경한다.
   *
   * @param tenantId - 대상 테넌트 ID
   * @param variables - Terraform 변수
   * @returns apply 실행 결과 출력
   */
  abstract apply(tenantId: string, variables: Record<string, string>): Promise<string>;

  /**
   * Terraform destroy 실행. 테넌트 인프라를 삭제한다.
   *
   * @param tenantId - 대상 테넌트 ID
   * @returns destroy 실행 결과 출력
   */
  abstract destroy(tenantId: string): Promise<string>;
}
