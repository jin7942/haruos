import { Injectable, Logger } from '@nestjs/common';
import { Observable, concat, of, EMPTY } from 'rxjs';
import { finalize, scan } from 'rxjs/operators';
import { ContextManagerService } from '../context/context-manager.service';
import { IntentParserService } from './intent-parser.service';
import { AgentRouterService } from './agent-router.service';
import { ChatRequestDto } from './dto/chat.request.dto';
import { ChatResponseDto } from './dto/chat.response.dto';
import { ChatMessageDto } from '../../core/ai-gateway/dto/ai-chat.request.dto';

/**
 * 메인 오케스트레이터 서비스.
 * 사용자 메시지를 받아 의도를 분석하고, 적절한 에이전트에 라우팅한다.
 *
 * 흐름:
 * 1. ContextManagerService로 대화 맥락 조회/생성
 * 2. IntentParserService로 의도 분석
 * 3. AgentRouterService로 에이전트 라우팅
 * 4. 결과를 ContextManagerService로 저장
 * 5. 응답 반환
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly contextManager: ContextManagerService,
    private readonly intentParser: IntentParserService,
    private readonly agentRouter: AgentRouterService,
  ) {}

  /**
   * 사용자 메시지를 처리하고 AI 응답을 반환한다.
   *
   * @param userId - 사용자 ID (JWT에서 추출)
   * @param dto - 대화 요청 (메시지, 대화 ID)
   * @returns 대화 응답 (AI 응답, 에이전트, 액션)
   */
  async processMessage(userId: string, dto: ChatRequestDto): Promise<ChatResponseDto> {
    this.logger.log(`Processing message from user: ${userId}`);

    // 1. 대화 맥락 조회 또는 생성
    const conversation = await this.contextManager.getOrCreateConversation(
      userId,
      dto.conversationId,
    );

    // 2. 사용자 메시지 저장
    await this.contextManager.addMessage(conversation.id, 'user', dto.message);

    // 3. 최근 메시지 조회 (대화 맥락)
    const recentMessages = await this.contextManager.getRecentMessages(conversation.id);
    const context: ChatMessageDto[] = recentMessages
      .slice(0, -1) // 방금 저장한 메시지 제외 (직접 전달)
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

    // 4. 의도 분석
    const intent = await this.intentParser.parseIntent(dto.message, context);

    // 5. 에이전트 라우팅 및 처리
    const agentResponse = await this.agentRouter.route(intent, dto.message, context);

    // 6. AI 응답 저장
    await this.contextManager.addMessage(conversation.id, 'assistant', agentResponse.response, {
      agent: agentResponse.agent,
      intent: intent.intent,
      confidence: intent.confidence,
    });

    return ChatResponseDto.from(
      agentResponse.response,
      agentResponse.agent,
      conversation.id,
      agentResponse.actions,
    );
  }

  /**
   * 사용자 메시지를 처리하고 AI 응답을 SSE 스트리밍으로 반환한다.
   * 각 청크는 MessageEvent 형태로 전송되며, 완료 시 전체 응답을 대화에 저장한다.
   *
   * @param userId - 사용자 ID (JWT에서 추출)
   * @param dto - 대화 요청 (메시지, 대화 ID)
   * @returns SSE MessageEvent Observable
   */
  async processMessageStream(
    userId: string,
    dto: ChatRequestDto,
  ): Promise<Observable<MessageEvent>> {
    this.logger.log(`Processing streaming message from user: ${userId}`);

    // 1. 대화 맥락 조회 또는 생성
    const conversation = await this.contextManager.getOrCreateConversation(
      userId,
      dto.conversationId,
    );

    // 2. 사용자 메시지 저장
    await this.contextManager.addMessage(conversation.id, 'user', dto.message);

    // 3. 최근 메시지 조회 (대화 맥락)
    const recentMessages = await this.contextManager.getRecentMessages(conversation.id);
    const context: ChatMessageDto[] = recentMessages
      .slice(0, -1)
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

    // 4. 의도 분석
    const intent = await this.intentParser.parseIntent(dto.message, context);

    // 5. 스트리밍 응답 생성
    const metaEvent = new MessageEvent('meta', {
      data: JSON.stringify({
        conversationId: conversation.id,
        agent: intent.agent,
      }),
    });

    let fullResponse = '';
    const textStream$ = this.agentRouter.routeStream(intent, dto.message, context).pipe(
      scan((acc, chunk) => acc + chunk, ''),
      finalize(async () => {
        // 스트리밍 완료 시 전체 응답 저장
        if (fullResponse) {
          await this.contextManager.addMessage(conversation.id, 'assistant', fullResponse, {
            agent: intent.agent,
            intent: intent.intent,
            confidence: intent.confidence,
          });
        }
      }),
    );

    const stream$: Observable<MessageEvent> = new Observable((subscriber) => {
      subscriber.next(metaEvent);

      const sub = this.agentRouter.routeStream(intent, dto.message, context).subscribe({
        next: (chunk) => {
          fullResponse += chunk;
          subscriber.next(new MessageEvent('chunk', { data: chunk }));
        },
        error: (err) => {
          subscriber.next(
            new MessageEvent('error', { data: JSON.stringify({ message: err.message }) }),
          );
          subscriber.complete();
        },
        complete: () => {
          // 전체 응답 저장
          this.contextManager
            .addMessage(conversation.id, 'assistant', fullResponse, {
              agent: intent.agent,
              intent: intent.intent,
              confidence: intent.confidence,
            })
            .then(() => {
              subscriber.next(
                new MessageEvent('done', {
                  data: JSON.stringify({ conversationId: conversation.id }),
                }),
              );
              subscriber.complete();
            })
            .catch((err) => {
              this.logger.error(`Failed to save streamed response: ${err.message}`);
              subscriber.complete();
            });
        },
      });

      return () => sub.unsubscribe();
    });

    return stream$;
  }
}
