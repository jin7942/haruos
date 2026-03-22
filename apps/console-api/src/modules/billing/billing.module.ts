import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaymentPort } from './ports/payment.port';
import { StripeAdapter } from './adapters/stripe.adapter';
import { SubscriptionEntity } from './entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity])],
  controllers: [BillingController],
  providers: [
    BillingService,
    { provide: PaymentPort, useClass: StripeAdapter },
  ],
  exports: [BillingService],
})
export class BillingModule {}
