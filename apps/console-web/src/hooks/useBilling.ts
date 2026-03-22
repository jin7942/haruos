import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, CreateCheckoutParams, CreatePortalParams } from '../api/billing.api';

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

/** Stripe Checkout 세션 생성 mutation. 성공 시 checkoutUrl로 리다이렉트. */
export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (params: CreateCheckoutParams) => billingApi.createCheckoutSession(params),
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
  });
}

/** Stripe Customer Portal 세션 생성 mutation. 성공 시 portalUrl로 리다이렉트. */
export function useCreatePortalSession() {
  return useMutation({
    mutationFn: (params: CreatePortalParams) => billingApi.createPortalSession(params),
    onSuccess: (data) => {
      window.location.href = data.portalUrl;
    },
  });
}

/** 인보이스 목록 조회 훅. */
export function useInvoices(tenantId: string) {
  return useQuery({
    queryKey: ['invoices', tenantId],
    queryFn: () => billingApi.listInvoices(tenantId),
    enabled: !!tenantId,
    retry: false,
  });
}
