import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { ChatMessageDto } from '../../core/ai-gateway/dto/ai-chat.request.dto';
import { ParsedIntent } from './intent-parser.service';
import { ActionVo } from './dto/chat.response.dto';

/** 에이전트 처리 결과. */
export interface AgentResponse {
  /** 에이전트 응답 텍스트 */
  response: string;
  /** 처리한 에이전트 이름 */
  agent: string;
  /** 수행된 액션 목록 */
  actions: ActionVo[];
}

/**
 * 에이전트 라우팅 서비스.
 * 분석된 인텐트에 따라 적절한 에이전트로 라우팅한다.
 * 해당 에이전트가 없으면 AiGatewayService로 직접 대화 응답을 생성한다.
 */
@Injectable()
export class AgentRouterService {
  private readonly logger = new Logger(AgentRouterService.name);

  constructor(private readonly aiGateway: AiGatewayService) {}

  /**
   * 인텐트에 따라 적절한 에이전트로 라우팅하고 결과를 반환한다.
   *
   * @param intent - 파싱된 인텐트
   * @param message - 원본 사용자 메시지
   * @param context - 대화 맥락 메시지 목록
   * @returns 에이전트 처리 결과
   */
  async route(intent: ParsedIntent, message: string, context: ChatMessageDto[]): Promise<AgentResponse> {
    this.logger.log(`Routing to agent: ${intent.agent} (intent: ${intent.intent})`);

    switch (intent.agent) {
      case 'project':
      case 'schedule':
      case 'document':
      case 'knowledge':
      case 'file':
        // 에이전트별 구체 로직은 각 에이전트 모듈 연동 시 구현.
        // 현재는 AI에게 에이전트 컨텍스트를 포함하여 응답 생성.
        return this.handleWithAi(intent, message, context);
      default:
        return this.handleWithAi(intent, message, context);
    }
  }

  /**
   * AI 모델을 직접 호출하여 대화 응답을 생성한다.
   * 에이전트가 아직 구현되지 않았거나 일반 대화인 경우 사용.
   */
  private async handleWithAi(
    intent: ParsedIntent,
    message: string,
    context: ChatMessageDto[],
  ): Promise<AgentResponse> {
    const systemPrompt: ChatMessageDto = {
      role: 'system',
      content: this.buildSystemPrompt(intent),
    };

    const userMessage: ChatMessageDto = {
      role: 'user',
      content: message,
    };

    const messages = [systemPrompt, ...context, userMessage];
    const aiResponse = await this.aiGateway.chat(messages);

    return {
      response: aiResponse.content,
      agent: intent.agent,
      actions: [],
    };
  }

  /**
   * 에이전트 컨텍스트에 맞는 시스템 프롬프트를 생성한다.
   */
  private buildSystemPrompt(intent: ParsedIntent): string {
    const agentPrompts: Record<string, string> = {
      schedule: '당신은 일정 관리 전문 AI 비서입니다. 사용자의 일정 생성, 조회, 수정 요청을 처리합니다.',
      project: '당신은 프로젝트 관리 전문 AI 비서입니다. 태스크 생성, 진행 현황 조회, 할당 등을 처리합니다.',
      document: '당신은 문서 관리 전문 AI 비서입니다. 문서 검색, 요약, 변환 요청을 처리합니다.',
      knowledge: '당신은 지식 검색 전문 AI 비서입니다. 사내 지식베이스에서 정보를 검색하여 답변합니다.',
      file: '당신은 파일 관리 전문 AI 비서입니다. 파일 업로드, 다운로드, 정리 요청을 처리합니다.',
    };

    return agentPrompts[intent.agent]
      ?? '당신은 HaruOS의 AI 비서 "하루"입니다. 사용자의 업무를 도와주세요. 한국어로 답변합니다.';
  }
}
