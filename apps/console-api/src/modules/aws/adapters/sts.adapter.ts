import { Injectable, Logger } from '@nestjs/common';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';
import { AwsCredentialPort } from '../ports/aws-credential.port';
import { ExternalApiException } from '../../../common/exceptions/technical.exception';

/**
 * AWS STS 어댑터. AwsCredentialPort의 구현체.
 * AWS SDK를 사용하여 STS AssumeRole, Bedrock 접근 확인을 수행한다.
 */
@Injectable()
export class StsAdapter extends AwsCredentialPort {
  private readonly logger = new Logger(StsAdapter.name);

  /**
   * {@inheritDoc AwsCredentialPort.validateRole}
   */
  async validateRole(roleArn: string, externalId: string, region: string): Promise<boolean> {
    const client = new STSClient({ region });
    try {
      await client.send(
        new AssumeRoleCommand({
          RoleArn: roleArn,
          RoleSessionName: 'haruos-validate',
          ExternalId: externalId,
          DurationSeconds: 900,
        }),
      );
      return true;
    } catch (error: unknown) {
      const code = (error as { name?: string }).name ?? '';
      if (code === 'AccessDenied' || code === 'MalformedPolicyDocument') {
        this.logger.warn(`Role validation failed: ${roleArn}, code=${code}`);
        return false;
      }
      throw new ExternalApiException('STS', `AssumeRole failed: ${(error as Error).message}`);
    }
  }

  /**
   * {@inheritDoc AwsCredentialPort.assumeRole}
   */
  async assumeRole(
    roleArn: string,
    externalId: string,
  ): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken: string }> {
    const client = new STSClient({});
    try {
      const result = await client.send(
        new AssumeRoleCommand({
          RoleArn: roleArn,
          RoleSessionName: 'haruos-session',
          ExternalId: externalId,
          DurationSeconds: 3600,
        }),
      );

      const credentials = result.Credentials;
      if (!credentials?.AccessKeyId || !credentials.SecretAccessKey || !credentials.SessionToken) {
        throw new ExternalApiException('STS', 'AssumeRole returned incomplete credentials');
      }

      return {
        accessKeyId: credentials.AccessKeyId,
        secretAccessKey: credentials.SecretAccessKey,
        sessionToken: credentials.SessionToken,
      };
    } catch (error: unknown) {
      if (error instanceof ExternalApiException) throw error;
      throw new ExternalApiException('STS', `AssumeRole failed: ${(error as Error).message}`);
    }
  }

  /**
   * {@inheritDoc AwsCredentialPort.checkBedrockAccess}
   */
  async checkBedrockAccess(roleArn: string, externalId: string, region: string): Promise<boolean> {
    try {
      const tempCredentials = await this.assumeRole(roleArn, externalId);

      const bedrockClient = new BedrockClient({
        region,
        credentials: {
          accessKeyId: tempCredentials.accessKeyId,
          secretAccessKey: tempCredentials.secretAccessKey,
          sessionToken: tempCredentials.sessionToken,
        },
      });

      const result = await bedrockClient.send(new ListFoundationModelsCommand({}));
      const models = result.modelSummaries ?? [];
      return models.some((m) => m.modelId?.includes('claude'));
    } catch (error: unknown) {
      if (error instanceof ExternalApiException) throw error;
      this.logger.warn(`Bedrock access check failed: ${(error as Error).message}`);
      return false;
    }
  }
}
