import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { VectorSearchService } from './vector-search.service';
import { DocumentChunk } from './entities/document-chunk.entity';
import { Document } from '../document/entities/document.entity';
import { AiGatewayModule } from '../../core/ai-gateway/ai-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentChunk, Document]),
    AiGatewayModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeAgentService, VectorSearchService],
  exports: [KnowledgeAgentService],
})
export class KnowledgeModule {}
