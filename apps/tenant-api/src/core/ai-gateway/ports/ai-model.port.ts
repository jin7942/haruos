import { Observable } from 'rxjs';
import { ChatMessageDto, AiOptionsDto } from '../dto/ai-chat.request.dto';
import { AiChatResponseDto, IntentResultDto } from '../dto/ai-chat.response.dto';

/**
 * AI 모델 호출 포트.
 * Bedrock 멀티모델 fallback (Sonnet -> Haiku) 지원.
 * 모든 AI 관련 호출을 추상화하여 모델 교체 시 어댑터만 변경.
 */
export abstract class AiModelPort {
  /**
   * 대화 메시지 기반 AI 응답 생성.
   *
   * @param messages - 대화 메시지 목록
   * @param options - 모델 호출 옵션 (maxTokens, temperature)
   * @returns AI 응답 (텍스트, 모델, 토큰 사용량)
   */
  abstract chat(messages: ChatMessageDto[], options?: AiOptionsDto): Promise<AiChatResponseDto>;

  /**
   * 대화 메시지 기반 AI 응답을 스트리밍으로 생성.
   * 청크 단위로 텍스트를 전송한다.
   *
   * @param messages - 대화 메시지 목록
   * @param options - 모델 호출 옵션 (maxTokens, temperature)
   * @returns 텍스트 청크 Observable
   */
  abstract streamChat(messages: ChatMessageDto[], options?: AiOptionsDto): Observable<string>;

  /**
   * 텍스트 요약.
   *
   * @param text - 요약할 원문
   * @returns 요약된 텍스트
   */
  abstract summarize(text: string): Promise<string>;

  /**
   * 사용자 메시지에서 인텐트(의도) 추출.
   *
   * @param message - 사용자 메시지
   * @returns 인텐트, 신뢰도, 엔티티
   */
  abstract extractIntent(message: string): Promise<IntentResultDto>;

  /**
   * 텍스트 임베딩 벡터 생성.
   *
   * @param text - 임베딩할 텍스트
   * @returns 임베딩 벡터 (float 배열)
   */
  abstract generateEmbedding(text: string): Promise<number[]>;
}
