import { Injectable } from '@nestjs/common';
import { AiGatewayPort } from '../ports/ai-gateway.port';

@Injectable()
export class BedrockAdapter implements AiGatewayPort {
  async invoke(prompt: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async *invokeStream(prompt: string): AsyncGenerator<string> {
    throw new Error('Not implemented');
  }
}
