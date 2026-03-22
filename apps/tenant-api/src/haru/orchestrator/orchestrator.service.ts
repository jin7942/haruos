import { Injectable, Logger } from '@nestjs/common';
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
}
