import { Injectable, Logger } from '@nestjs/common';
import { PaymentPort } from '../ports/payment.port';

/**
 * Stripe 결제 어댑터 (P4 stub).
 * 실제 Stripe SDK 연동 전까지 더미 응답을 반환한다.
 */
@Injectable()
export class StripeAdapter extends PaymentPort {
  private readonly logger = new Logger(StripeAdapter.name);

  /** {@inheritDoc PaymentPort.createCustomer} */
  async createCustomer(email: string, name: string): Promise<string> {
    this.logger.warn(`[STUB] createCustomer: email=${email}, name=${name}`);
    return `cus_stub_${Date.now()}`;
  }

  /** {@inheritDoc PaymentPort.createSubscription} */
  async createSubscription(customerId: string, priceId: string): Promise<string> {
    this.logger.warn(`[STUB] createSubscription: customerId=${customerId}, priceId=${priceId}`);
    return `sub_stub_${Date.now()}`;
  }

  /** {@inheritDoc PaymentPort.cancelSubscription} */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    this.logger.warn(`[STUB] cancelSubscription: subscriptionId=${subscriptionId}`);
  }

  /** {@inheritDoc PaymentPort.getSubscription} */
  async getSubscription(subscriptionId: string): Promise<{ status: string; currentPeriodEnd: Date }> {
    this.logger.warn(`[STUB] getSubscription: subscriptionId=${subscriptionId}`);
    return {
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}
