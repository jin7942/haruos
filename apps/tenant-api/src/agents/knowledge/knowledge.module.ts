import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { DocumentChunk } from './entities/document-chunk.entity';
import { AiGatewayModule } from '../../core/ai-gateway/ai-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentChunk]),
    AiGatewayModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeAgentService],
  exports: [KnowledgeAgentService],
})
export class KnowledgeModule {}
