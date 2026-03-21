import { Module } from '@nestjs/common';
import { S3EventListener } from './s3-event.listener';

@Module({
  providers: [S3EventListener],
  exports: [S3EventListener],
})
export class WatchdogModule {}
