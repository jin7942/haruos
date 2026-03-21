/**
 * AWS 자격증명 검증 및 역할 수임 포트.
 */
export abstract class AwsCredentialPort {
  /** IAM Role ARN 유효성 검증 */
  abstract validateRole(roleArn: string, externalId: string): Promise<boolean>;

  /** STS AssumeRole 수행 */
  abstract assumeRole(roleArn: string, externalId: string): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken: string }>;

  /** Bedrock 접근 권한 확인 */
  abstract checkBedrockAccess(roleArn: string, externalId: string): Promise<boolean>;
}
