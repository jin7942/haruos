import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainApi, type CreateDomainParams } from '../api/domain.api';

/** 도메인 목록 조회 훅. */
export function useDomains(tenantId: string) {
  return useQuery({
    queryKey: ['domains', tenantId],
    queryFn: () => domainApi.findAll(tenantId),
    enabled: !!tenantId,
  });
}

/** 도메인 추가 mutation. */
export function useCreateDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, params }: { tenantId: string; params: CreateDomainParams }) =>
      domainApi.create(tenantId, params),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['domains', tenantId] });
    },
  });
}

/** 도메인 삭제 mutation. */
export function useDeleteDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, domainId }: { tenantId: string; domainId: string }) =>
      domainApi.remove(tenantId, domainId),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['domains', tenantId] });
    },
  });
}

/** DNS 검증 mutation. */
export function useVerifyDns() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tenantId, domainId }: { tenantId: string; domainId: string }) =>
      domainApi.verifyDns(tenantId, domainId),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: ['domains', tenantId] });
    },
  });
}
