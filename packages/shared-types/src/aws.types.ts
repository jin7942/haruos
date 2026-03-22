/** CloudFormation 스택 생성 URL 응답. */
export interface CfnTemplateUrlResponse {
  templateUrl: string;
  externalId: string;
}

/** CloudFormation 1클릭 Quick Create Launch URL 응답. */
export interface CfnLaunchUrlResponse {
  launchUrl: string;
  externalId: string;
  stackName: string;
}

/** AWS 자격증명 응답. */
export interface AwsCredentialResponse {
  id: string;
  tenantId: string;
  roleArn: string;
  region: string;
  status: string;
  validatedAt: string | null;
  createdAt: string;
}
