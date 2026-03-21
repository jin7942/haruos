import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HaruController } from './haru.controller';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { IntentParserService } from './orchestrator/intent-parser.service';
import { AgentRouterService } from './orchestrator/agent-router.service';
import { ContextManagerService } from './context/context-manager.service';
import { BatchSchedulerService } from './batch/batch-scheduler.service';
import { S3EventListener } from './watchdog/s3-event.listener';
import { Conversation } from './context/entities/conversation.entity';
import { Message } from './context/entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message])],
  controllers: [HaruController],
  providers: [
    OrchestratorService,
    IntentParserService,
    AgentRouterService,
    ContextManagerService,
    BatchSchedulerService,
    S3EventListener,
  ],
  exports: [OrchestratorService],
})
export class HaruModule {}
