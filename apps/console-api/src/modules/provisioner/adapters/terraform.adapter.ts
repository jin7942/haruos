import { Injectable } from '@nestjs/common';
import { TerraformPort } from '../ports/terraform.port';

@Injectable()
export class TerraformAdapter extends TerraformPort {
  async plan(workingDir: string, variables: Record<string, string>): Promise<string> {
    throw new Error('Not implemented');
  }

  async apply(workingDir: string, variables: Record<string, string>): Promise<string> {
    throw new Error('Not implemented');
  }

  async destroy(workingDir: string, variables: Record<string, string>): Promise<string> {
    throw new Error('Not implemented');
  }
}
