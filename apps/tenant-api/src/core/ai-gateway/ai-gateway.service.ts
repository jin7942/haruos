import { Injectable } from '@nestjs/common';
import { AiGatewayPort } from './ports/ai-gateway.port';

@Injectable()
export class AiGatewayService {
  constructor(private readonly aiGateway: AiGatewayPort) {}
}
