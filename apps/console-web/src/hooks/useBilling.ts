import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../api/billing.api';

/** 구독 조회 훅. */
export function useSubscription(tenantId: string) {
  return useQuery({
    queryKey: ['billing', tenantId],
    queryFn: () => billingApi.getSubscription(tenantId),
    enabled: !!tenantId,
    retry: false,
  });
}

/** 구독 취소 mutation. */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tenantId: string) => billingApi.cancelSubscription(tenantId),
    onSuccess: (_data, tenantId) => {
      queryClient.invalidateQueries({ queryKey: ['billing', tenantId] });
    },
  });
}
