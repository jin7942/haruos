/**
 * AWS 자격증명 검증 및 역할 수임 포트.
 * STS, Bedrock 등 외부 AWS API 호출을 추상화한다.
 */
export abstract class AwsCredentialPort {
  /**
   * IAM Role ARN 유효성 검증. STS AssumeRole을 시도하여 역할이 유효한지 확인.
   *
   * @param roleArn - 검증할 IAM Role ARN
   * @param externalId - External ID (크로스 어카운트 보안용)
   * @param region - AWS 리전
   * @returns 역할이 유효하면 true
   * @throws ExternalApiException STS API 호출 실패 시
   */
  abstract validateRole(roleArn: string, externalId: string, region: string): Promise<boolean>;

  /**
   * STS AssumeRole 수행. 임시 자격증명(1시간)을 발급받는다.
   *
   * @param roleArn - 수임할 IAM Role ARN
   * @param externalId - External ID
   * @returns 임시 자격증명 (accessKeyId, secretAccessKey, sessionToken)
   * @throws ExternalApiException STS API 호출 실패 시
   */
  abstract assumeRole(
    roleArn: string,
    externalId: string,
  ): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken: string }>;

  /**
   * Bedrock 모델 접근 권한 확인. 해당 리전에서 Claude 모델 사용 가능 여부를 검증.
   *
   * @param roleArn - IAM Role ARN
   * @param externalId - External ID
   * @param region - 확인할 AWS 리전
   * @returns Bedrock 접근 가능하면 true
   * @throws ExternalApiException Bedrock API 호출 실패 시
   */
  abstract checkBedrockAccess(roleArn: string, externalId: string, region: string): Promise<boolean>;
}
