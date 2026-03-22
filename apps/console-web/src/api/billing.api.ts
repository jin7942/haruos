import type { SubscriptionResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 구독 생성 파라미터. */
export interface CreateSubscriptionParams {
  tenantId: string;
  planType: string;
  email: string;
  name: string;
  priceId?: string;
}

export const billingApi = {
  /** 구독 생성. */
  createSubscription: (params: CreateSubscriptionParams) =>
    apiClient.post<SubscriptionResponse>('/billing/subscriptions', params).then((r) => r.data),

  /** 구독 조회. */
  getSubscription: (tenantId: string) =>
    apiClient.get<SubscriptionResponse>(`/billing/subscriptions/${tenantId}`).then((r) => r.data),

  /** 구독 취소. */
  cancelSubscription: (tenantId: string) =>
    apiClient.delete<SubscriptionResponse>(`/billing/subscriptions/${tenantId}`).then((r) => r.data),
};
