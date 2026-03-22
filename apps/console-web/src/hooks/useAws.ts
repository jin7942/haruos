import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { awsApi, type ValidateAwsParams } from '../api/aws.api';

/** CloudFormation 템플릿 URL 조회 훅. */
export function useCfnTemplateUrl(tenantId: string) {
  return useQuery({
    queryKey: ['aws', tenantId, 'cfn'],
    queryFn: () => awsApi.getCfnTemplateUrl(tenantId),
    enabled: !!tenantId,
  });
}

/** AWS 자격증명 조회 훅. */
export function useAwsCredential(tenantId: string) {
  return useQuery({
    queryKey: ['aws', tenantId, 'credential'],
    queryFn: () => awsApi.findCredential(tenantId),
    enabled: !!tenantId,
    retry: false,
  });
}

/** AWS 자격증명 검증 mutation. */
export function useValidateAws() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, params }: { tenantId: string; params: ValidateAwsParams }) =>
      awsApi.validateCredential(tenantId, params),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['aws', tenantId] });
    },
  });
}
