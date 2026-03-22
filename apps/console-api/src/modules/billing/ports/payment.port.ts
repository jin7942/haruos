/**
 * 결제 처리 포트.
 * 외부 결제 시스템(Stripe 등)을 추상화한다.
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
   * 구독을 생성한다 (14일 무료 체험 포함).
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
  abstract getSubscription(subscriptionId: string): Promise<{
    status: string;
    currentPeriodEnd: Date;
  }>;

  /**
   * Checkout 세션을 생성한다 (결제 페이지 리다이렉트용).
   *
   * @param customerId - 외부 시스템의 고객 ID
   * @param priceId - 요금제 가격 ID
   * @param successUrl - 결제 성공 후 리다이렉트 URL
   * @param cancelUrl - 결제 취소 후 리다이렉트 URL
   * @returns Checkout 세션 URL
   */
  abstract createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string>;

  /**
   * 고객 포털 세션을 생성한다 (결제수단 변경 등).
   *
   * @param customerId - 외부 시스템의 고객 ID
   * @param returnUrl - 포털에서 돌아올 URL
   * @returns 포털 세션 URL
   */
  abstract createPortalSession(customerId: string, returnUrl: string): Promise<string>;

  /**
   * 웹훅 이벤트 서명을 검증하고 파싱한다.
   *
   * @param payload - 원시 요청 body
   * @param signature - Stripe-Signature 헤더
   * @returns 검증된 이벤트 객체
   */
  abstract verifyWebhookEvent(payload: Buffer, signature: string): Promise<WebhookEvent>;

  /**
   * 고객의 인보이스 목록을 조회한다.
   *
   * @param customerId - 외부 시스템의 고객 ID
   * @param limit - 조회 개수
   * @returns 인보이스 목록
   */
  abstract listInvoices(customerId: string, limit: number): Promise<InvoiceItem[]>;
}

/** 웹훅 이벤트 표준 형식. */
export interface WebhookEvent {
  type: string;
  data: {
    subscriptionId?: string;
    customerId?: string;
    status?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    invoiceId?: string;
    amountPaid?: number;
    currency?: string;
  };
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
