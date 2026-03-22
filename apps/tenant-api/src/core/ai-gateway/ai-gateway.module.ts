import { Module } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { AiModelPort } from './ports/ai-model.port';
import { BedrockAdapter } from './adapters/bedrock.adapter';

@Module({
  providers: [
    AiGatewayService,
    { provide: AiModelPort, useClass: BedrockAdapter },
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
