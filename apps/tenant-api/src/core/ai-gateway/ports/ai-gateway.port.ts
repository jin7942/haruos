/**
 * AI 모델 호출 포트.
 * Bedrock 멀티모델 fallback (Sonnet -> Haiku) 지원.
 */
export abstract class AiGatewayPort {
  abstract invoke(prompt: string): Promise<string>;
  abstract invokeStream(prompt: string): AsyncGenerator<string>;
}
