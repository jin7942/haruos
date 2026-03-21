import { Injectable } from '@nestjs/common';
import { PaymentPort } from '../ports/payment.port';

@Injectable()
export class StripeAdapter extends PaymentPort {
  async createCustomer(email: string, name: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async createSubscription(customerId: string, priceId: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
