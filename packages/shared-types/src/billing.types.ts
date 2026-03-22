/** 구독 상태. */
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'EXPIRED';

/** 구독 응답. */
export interface SubscriptionResponse {
  id: string;
  tenantId: string;
  planType: string;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

/** 인보이스 항목. */
export interface InvoiceItem {
  id: string;
  amountPaid: number;
  currency: string;
  status: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  periodStart: string;
  periodEnd: string;
}
