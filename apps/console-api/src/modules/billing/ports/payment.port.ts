/**
 * 결제 처리 포트.
 * 외부 결제 시스템(Stripe 등)을 추상화한다.
 * 개발 환경에서는 StripeAdapter(stub), 프로덕션에서는 실제 Stripe 연동 어댑터로 교체.
 */
export abstract class PaymentPort {
  /**
   * 외부 결제 시스템에 고객을 생성한다.
   *
   * @param email - 고객 이메일
   * @param name - 고객 이름
   * @returns 외부 시스템의 고객 ID
   */
  abstract createCustomer(email: string, name: string): Promise<string>;

  /**
   * 구독을 생성한다.
   *
   * @param customerId - 외부 시스템의 고객 ID
   * @param priceId - 요금제 가격 ID
   * @returns 외부 시스템의 구독 ID
   */
  abstract createSubscription(customerId: string, priceId: string): Promise<string>;

  /**
   * 구독을 취소한다.
   *
   * @param subscriptionId - 외부 시스템의 구독 ID
   */
  abstract cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * 구독 정보를 조회한다.
   *
   * @param subscriptionId - 외부 시스템의 구독 ID
   * @returns 구독 상태 정보
   */
  abstract getSubscription(subscriptionId: string): Promise<{ status: string; currentPeriodEnd: Date }>;
}
