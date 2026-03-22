import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AiModelPort } from './ports/ai-model.port';
import { ChatMessageDto, AiOptionsDto } from './dto/ai-chat.request.dto';
import { AiChatResponseDto, IntentResultDto } from './dto/ai-chat.response.dto';

/**
 * AI Gateway 서비스.
 * AiModelPort를 통해 AI 모델에 접근한다.
 * 비즈니스 로직(예: 대화 이력 관리, 요약 결과 저장)은 이 서비스에서 처리.
 */
@Injectable()
export class AiGatewayService {
  constructor(private readonly aiModel: AiModelPort) {}

  /**
   * 대화 메시지 기반 AI 응답 생성.
   *
   * @param messages - 대화 메시지 목록
   * @param options - 모델 호출 옵션
   * @returns AI 응답
   */
  async chat(messages: ChatMessageDto[], options?: AiOptionsDto): Promise<AiChatResponseDto> {
    return this.aiModel.chat(messages, options);
  }

  /**
   * 대화 메시지 기반 AI 응답을 스트리밍으로 생성.
   *
   * @param messages - 대화 메시지 목록
   * @param options - 모델 호출 옵션
   * @returns 텍스트 청크 Observable
   */
  streamChat(messages: ChatMessageDto[], options?: AiOptionsDto): Observable<string> {
    return this.aiModel.streamChat(messages, options);
  }

  /**
   * 텍스트 요약.
   *
   * @param text - 요약할 원문
   * @returns 요약된 텍스트
   */
  async summarize(text: string): Promise<string> {
    return this.aiModel.summarize(text);
  }

  /**
   * 사용자 메시지에서 인텐트 추출.
   *
   * @param message - 사용자 메시지
   * @returns 인텐트 분석 결과
   */
  async extractIntent(message: string): Promise<IntentResultDto> {
    return this.aiModel.extractIntent(message);
  }

  /**
   * 텍스트 임베딩 벡터 생성.
   *
   * @param text - 임베딩할 텍스트
   * @returns 임베딩 벡터
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.aiModel.generateEmbedding(text);
  }
}
