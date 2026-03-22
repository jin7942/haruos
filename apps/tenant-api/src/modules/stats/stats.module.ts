import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Conversation } from '../../haru/context/entities/conversation.entity';
import { Message } from '../../haru/context/entities/message.entity';
import { BatchJob } from '../../haru/batch/entities/batch-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, BatchJob])],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
