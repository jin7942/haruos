import { Module } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';
import { AiGatewayPort } from './ports/ai-gateway.port';
import { BedrockAdapter } from './adapters/bedrock.adapter';

@Module({
  providers: [
    AiGatewayService,
    { provide: AiGatewayPort, useClass: BedrockAdapter },
  ],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
