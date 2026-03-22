import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentController } from './document.controller';
import { DocumentAgentService } from './document-agent.service';
import { Document } from './entities/document.entity';
import { AiGatewayModule } from '../../core/ai-gateway/ai-gateway.module';
import { DocEngineModule } from '../../core/doc-engine/doc-engine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    AiGatewayModule,
    DocEngineModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentAgentService],
  exports: [DocumentAgentService],
})
export class DocumentModule {}
