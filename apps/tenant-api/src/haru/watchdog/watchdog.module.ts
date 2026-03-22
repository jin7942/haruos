import { Module } from '@nestjs/common';
import { S3EventListener } from './s3-event.listener';
import { ClickUpWebhookController } from './clickup-webhook.controller';

@Module({
  controllers: [ClickUpWebhookController],
  providers: [S3EventListener],
  exports: [S3EventListener],
})
export class WatchdogModule {}
