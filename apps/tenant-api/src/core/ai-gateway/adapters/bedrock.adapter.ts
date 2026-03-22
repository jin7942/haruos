import { Injectable, Logger } from '@nestjs/common';
import { AiModelPort } from '../ports/ai-model.port';
import { ChatMessageDto, AiOptionsDto } from '../dto/ai-chat.request.dto';
import { AiChatResponseDto, IntentResultDto } from '../dto/ai-chat.response.dto';

/**
 * Bedrock AI 모델 어댑터 (stub).
 * 프로덕션에서는 AWS SDK를 사용하여 Bedrock API를 호출한다.
 * Sonnet -> Haiku 순서로 fallback 시도.
 */
@Injectable()
export class BedrockAdapter extends AiModelPort {
  private readonly logger = new Logger(BedrockAdapter.name);

  /** {@inheritDoc AiModelPort.chat} */
  async chat(messages: ChatMessageDto[], options?: AiOptionsDto): Promise<AiChatResponseDto> {
    this.logger.warn('[Stub] Bedrock chat 호출. 프로덕션에서는 실제 API 호출로 교체.');
    return AiChatResponseDto.from(
      '[Stub] AI 응답입니다.',
      'anthropic.claude-3-sonnet',
      messages.reduce((sum, m) => sum + m.content.length, 0),
      20,
    );
  }

  /** {@inheritDoc AiModelPort.summarize} */
  async summarize(text: string): Promise<string> {
    this.logger.warn('[Stub] Bedrock summarize 호출.');
    return `[Stub] 요약: ${text.substring(0, 100)}...`;
  }

  /** {@inheritDoc AiModelPort.extractIntent} */
  async extractIntent(message: string): Promise<IntentResultDto> {
    this.logger.warn('[Stub] Bedrock extractIntent 호출.');
    return IntentResultDto.from('unknown', 0.5, {});
  }

  /** {@inheritDoc AiModelPort.generateEmbedding} */
  async generateEmbedding(text: string): Promise<number[]> {
    this.logger.warn('[Stub] Bedrock generateEmbedding 호출.');
    return new Array(1536).fill(0);
  }
}
