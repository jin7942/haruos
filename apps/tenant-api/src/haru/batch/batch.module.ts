import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchSchedulerService } from './batch-scheduler.service';
import { BatchJob } from './entities/batch-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BatchJob])],
  providers: [BatchSchedulerService],
  exports: [BatchSchedulerService],
})
export class BatchModule {}
