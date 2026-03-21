import { Injectable } from '@nestjs/common';
import { TerraformPort } from '../ports/terraform.port';

/**
 * Terraform CLI 어댑터.
 * 실제 구현은 Terraform CLI 또는 Terraform Cloud API를 호출한다.
 */
@Injectable()
export class TerraformAdapter extends TerraformPort {
  async plan(tenantId: string, variables: Record<string, string>): Promise<string> {
    throw new Error('Not implemented');
  }

  async apply(tenantId: string, variables: Record<string, string>): Promise<string> {
    throw new Error('Not implemented');
  }

  async destroy(tenantId: string): Promise<string> {
    throw new Error('Not implemented');
  }
}
