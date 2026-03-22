import type { SubscriptionResponse, InvoiceItem } from '@haruos/shared-types';
import { apiClient } from './client';

/** 구독 생성 파라미터. */
export interface CreateSubscriptionParams {
  tenantId: string;
  email: string;
  name: string;
}

/** Checkout 세션 생성 파라미터. */
export interface CreateCheckoutParams {
  tenantId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

/** Portal 세션 생성 파라미터. */
export interface CreatePortalParams {
  tenantId: string;
  returnUrl: string;
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

  /** Stripe Checkout 세션 생성. */
  createCheckoutSession: (params: CreateCheckoutParams) =>
    apiClient.post<{ checkoutUrl: string }>('/billing/checkout', params).then((r) => r.data),

  /** Stripe Customer Portal 세션 생성. */
  createPortalSession: (params: CreatePortalParams) =>
    apiClient.post<{ portalUrl: string }>('/billing/portal', params).then((r) => r.data),

  /** 인보이스 목록 조회. */
  listInvoices: (tenantId: string, limit = 10) =>
    apiClient.get<InvoiceItem[]>(`/billing/invoices/${tenantId}`, { params: { limit } }).then((r) => r.data),
};
