import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { IntentParserService } from './intent-parser.service';
import { AgentRouterService } from './agent-router.service';
import { ContextModule } from '../context/context.module';
import { AiGatewayModule } from '../../core/ai-gateway/ai-gateway.module';

@Module({
  imports: [ContextModule, AiGatewayModule],
  providers: [OrchestratorService, IntentParserService, AgentRouterService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
