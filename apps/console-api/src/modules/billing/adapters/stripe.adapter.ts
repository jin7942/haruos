import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentPort, WebhookEvent, InvoiceItem } from '../ports/payment.port';
import { ExternalApiException } from '../../../common/exceptions/technical.exception';

/** 무료 체험 기간 (일). */
const TRIAL_PERIOD_DAYS = 14;

/**
 * Stripe 실결제 어댑터.
 * Stripe SDK를 사용하여 Customer, Subscription, Checkout, Portal, Webhook을 처리한다.
 */
@Injectable()
export class StripeAdapter extends PaymentPort {
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    super();
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    this.stripe = new Stripe(secretKey);
  }

  /** {@inheritDoc PaymentPort.createCustomer} */
  async createCustomer(email: string, name: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({ email, name });
      this.logger.log(`Stripe customer created: ${customer.id}`);
      return customer.id;
    } catch (error) {
      throw new ExternalApiException('Stripe', `createCustomer failed: ${(error as Error).message}`);
    }
  }

  /** {@inheritDoc PaymentPort.createSubscription} */
  async createSubscription(customerId: string, priceId: string): Promise<string> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: TRIAL_PERIOD_DAYS,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      this.logger.log(`Stripe subscription created: ${subscription.id} (trial: ${TRIAL_PERIOD_DAYS}d)`);
      return subscription.id;
    } catch (error) {
      throw new ExternalApiException('Stripe', `createSubscription failed: ${(error as Error).message}`);
    }
  }

  /** {@inheritDoc PaymentPort.cancelSubscription} */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
      this.logger.log(`Stripe subscription cancelled: ${subscriptionId}`);
    } catch (error) {
      throw new ExternalApiException('Stripe', `cancelSubscription failed: ${(error as Error).message}`);
    }
  }

  /** {@inheritDoc PaymentPort.getSubscription} */
  async getSubscription(subscriptionId: string): Promise<{ status: string; currentPeriodEnd: Date }> {
    try {
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items'],
      });
      // Stripe v20+ (2026 API): current_period_end is on subscription items
      const firstItem = sub.items.data[0];
      const periodEnd = firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return {
        status: sub.status,
        currentPeriodEnd: periodEnd,
      };
    } catch (error) {
      throw new ExternalApiException('Stripe', `getSubscription failed: ${(error as Error).message}`);
    }
  }

  /** {@inheritDoc PaymentPort.createCheckoutSession} */
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: { trial_period_days: TRIAL_PERIOD_DAYS },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      if (!session.url) {
        throw new Error('Checkout session URL is null');
      }

      this.logger.log(`Checkout session created: ${session.id}`);
      return session.url;
    } catch (error) {
      throw new ExternalApiException('Stripe', `createCheckoutSession failed: ${(error as Error).message}`);
    }
  }

  /** {@inheritDoc PaymentPort.createPortalSession} */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      this.logger.log(`Portal session created for customer: ${customerId}`);
      return session.url;
    } catch (error) {
      throw new ExternalApiException('Stripe', `createPortalSession failed: ${(error as Error).message}`);
    }
  }

  /** {@inheritDoc PaymentPort.verifyWebhookEvent} */
  async verifyWebhookEvent(payload: Buffer, signature: string): Promise<WebhookEvent> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
    } catch (error) {
      throw new ExternalApiException('Stripe', `Webhook signature verification failed: ${(error as Error).message}`);
    }

    return this.mapStripeEvent(event);
  }

  /** {@inheritDoc PaymentPort.listInvoices} */
  async listInvoices(customerId: string, limit: number): Promise<InvoiceItem[]> {
    try {
      const invoices = await this.stripe.invoices.list({ customer: customerId, limit });
      return invoices.data.map((inv) => ({
        id: inv.id,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status ?? 'unknown',
        paidAt: inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
          : null,
        invoiceUrl: inv.hosted_invoice_url ?? null,
        periodStart: new Date(inv.period_start * 1000).toISOString(),
        periodEnd: new Date(inv.period_end * 1000).toISOString(),
      }));
    } catch (error) {
      throw new ExternalApiException('Stripe', `listInvoices failed: ${(error as Error).message}`);
    }
  }

  /**
   * Stripe 이벤트를 내부 WebhookEvent 형식으로 변환한다.
   * Stripe v20+ (2026 API): subscription은 parent.subscription_details에,
   * current_period는 subscription items에 위치.
   */
  private mapStripeEvent(event: Stripe.Event): WebhookEvent {
    const result: WebhookEvent = { type: event.type, data: {} };

    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionRef = subDetails?.subscription;
        const subscriptionId = typeof subscriptionRef === 'string'
          ? subscriptionRef
          : subscriptionRef?.id;
        result.data = {
          customerId: typeof invoice.customer === 'string' ? invoice.customer : undefined,
          subscriptionId,
          amountPaid: event.type === 'invoice.paid' ? invoice.amount_paid : undefined,
          currency: event.type === 'invoice.paid' ? invoice.currency : undefined,
          invoiceId: event.type === 'invoice.paid' ? invoice.id : undefined,
        };
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const firstItem = sub.items?.data?.[0];
        result.data = {
          subscriptionId: sub.id,
          customerId: typeof sub.customer === 'string' ? sub.customer : undefined,
          status: sub.status,
          currentPeriodStart: firstItem?.current_period_start
            ? new Date(firstItem.current_period_start * 1000)
            : undefined,
          currentPeriodEnd: firstItem?.current_period_end
            ? new Date(firstItem.current_period_end * 1000)
            : undefined,
        };
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return result;
  }
}
