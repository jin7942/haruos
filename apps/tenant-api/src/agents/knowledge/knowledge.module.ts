import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeAgentService } from './knowledge-agent.service';
import { DocumentChunk } from './entities/document-chunk.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentChunk])],
  providers: [KnowledgeAgentService],
  exports: [KnowledgeAgentService],
})
export class KnowledgeModule {}
