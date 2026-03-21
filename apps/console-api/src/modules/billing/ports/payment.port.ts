/**
 * 결제 처리 포트.
 */
export abstract class PaymentPort {
  /** Stripe 고객 생성 */
  abstract createCustomer(email: string, name: string): Promise<string>;

  /** 구독 생성 */
  abstract createSubscription(customerId: string, priceId: string): Promise<string>;

  /** 구독 취소 */
  abstract cancelSubscription(subscriptionId: string): Promise<void>;
}
