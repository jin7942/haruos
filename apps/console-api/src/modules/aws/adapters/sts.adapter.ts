import { Injectable } from '@nestjs/common';
import { AwsCredentialPort } from '../ports/aws-credential.port';

/**
 * AWS STS 어댑터. AwsCredentialPort의 구현체.
 * AWS SDK를 사용하여 STS AssumeRole, Bedrock 접근 확인을 수행한다.
 */
@Injectable()
export class StsAdapter extends AwsCredentialPort {
  /**
   * {@inheritDoc AwsCredentialPort.validateRole}
   */
  async validateRole(roleArn: string, externalId: string, region: string): Promise<boolean> {
    // TODO(2026-03-21): AWS SDK STSClient를 사용하여 AssumeRole 시도.
    // 성공하면 true, AccessDenied/MalformedPolicyDocument 등이면 false.
    // 그 외 에러는 ExternalApiException으로 래핑.
    throw new Error('Not implemented');
  }

  /**
   * {@inheritDoc AwsCredentialPort.assumeRole}
   */
  async assumeRole(
    roleArn: string,
    externalId: string,
  ): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken: string }> {
    // TODO(2026-03-21): AWS SDK STSClient.assumeRole 호출.
    // DurationSeconds: 3600 (1시간).
    // Credentials에서 accessKeyId, secretAccessKey, sessionToken 추출.
    throw new Error('Not implemented');
  }

  /**
   * {@inheritDoc AwsCredentialPort.checkBedrockAccess}
   */
  async checkBedrockAccess(roleArn: string, externalId: string, region: string): Promise<boolean> {
    // TODO(2026-03-21): assumeRole로 임시 자격 획득 후
    // BedrockClient.listFoundationModels 호출하여 Claude 모델 가용 여부 확인.
    throw new Error('Not implemented');
  }
}
