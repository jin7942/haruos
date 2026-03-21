import { Module } from '@nestjs/common';
import { BatchSchedulerService } from './batch-scheduler.service';

@Module({
  providers: [BatchSchedulerService],
  exports: [BatchSchedulerService],
})
export class BatchModule {}
