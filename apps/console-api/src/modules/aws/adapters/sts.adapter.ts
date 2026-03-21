import { Injectable } from '@nestjs/common';
import { AwsCredentialPort } from '../ports/aws-credential.port';

@Injectable()
export class StsAdapter extends AwsCredentialPort {
  async validateRole(roleArn: string, externalId: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async assumeRole(roleArn: string, externalId: string): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken: string }> {
    throw new Error('Not implemented');
  }

  async checkBedrockAccess(roleArn: string, externalId: string): Promise<boolean> {
    throw new Error('Not implemented');
  }
}
