/**
 * Terraform 실행 포트.
 */
export abstract class TerraformPort {
  /** Terraform plan 실행 */
  abstract plan(workingDir: string, variables: Record<string, string>): Promise<string>;

  /** Terraform apply 실행 */
  abstract apply(workingDir: string, variables: Record<string, string>): Promise<string>;

  /** Terraform destroy 실행 */
  abstract destroy(workingDir: string, variables: Record<string, string>): Promise<string>;
}
