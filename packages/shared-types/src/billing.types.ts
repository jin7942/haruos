/** 구독 상태. */
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';

/** 구독 응답. */
export interface SubscriptionResponse {
  id: string;
  tenantId: string;
  planType: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  createdAt: string;
}
