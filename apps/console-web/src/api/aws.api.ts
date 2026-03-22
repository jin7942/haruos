import type { CfnTemplateUrlResponse, CfnLaunchUrlResponse, AwsCredentialResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** AWS 자격증명 검증 파라미터. */
export interface ValidateAwsParams {
  roleArn: string;
  externalId: string;
  region: string;
}

export const awsApi = {
  /** CloudFormation 스택 생성 URL 조회. */
  getCfnTemplateUrl: (tenantId: string) =>
    apiClient.get<CfnTemplateUrlResponse>(`/tenants/${tenantId}/aws/cfn-template-url`).then((r) => r.data),

  /** CloudFormation 1클릭 Quick Create URL 조회. */
  getCfnLaunchUrl: (tenantId: string, region?: string) =>
    apiClient.get<CfnLaunchUrlResponse>(`/tenants/${tenantId}/aws/cfn-launch-url`, {
      params: region ? { region } : undefined,
    }).then((r) => r.data),

  /** AWS 자격증명 검증. */
  validateCredential: (tenantId: string, params: ValidateAwsParams) =>
    apiClient.post<AwsCredentialResponse>(`/tenants/${tenantId}/aws/validate`, params).then((r) => r.data),

  /** AWS 자격증명 조회. */
  findCredential: (tenantId: string) =>
    apiClient.get<AwsCredentialResponse>(`/tenants/${tenantId}/aws/credential`).then((r) => r.data),
};
