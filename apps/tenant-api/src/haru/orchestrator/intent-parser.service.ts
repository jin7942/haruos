import { Injectable, Logger } from '@nestjs/common';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { ChatMessageDto } from '../../core/ai-gateway/dto/ai-chat.request.dto';

/** 파싱된 인텐트. */
export interface ParsedIntent {
  /** 인텐트 유형 (예: schedule, document, project, knowledge, file, general) */
  intent: string;
  /** 라우팅할 에이전트 이름 */
  agent: string;
  /** 추출된 엔티티 (슬롯 값) */
  entities: Record<string, string>;
  /** 인텐트 신뢰도 (0.0 ~ 1.0) */
  confidence: number;
}

/**
 * 의도 분석 서비스.
 * AiGatewayService를 사용하여 사용자 메시지에서 인텐트를 추출한다.
 */
@Injectable()
export class IntentParserService {
  private readonly logger = new Logger(IntentParserService.name);

  constructor(private readonly aiGateway: AiGatewayService) {}

  /**
   * 사용자 메시지와 대화 맥락을 분석하여 인텐트를 추출한다.
   *
   * @param message - 사용자 메시지
   * @param context - 이전 대화 메시지 목록
   * @returns 파싱된 인텐트
   */
  async parseIntent(message: string, context: ChatMessageDto[]): Promise<ParsedIntent> {
    const intentResult = await this.aiGateway.extractIntent(message);
    this.logger.debug(
      `Intent parsed: ${intentResult.intent} (confidence: ${intentResult.confidence})`,
    );

    const agent = this.mapIntentToAgent(intentResult.intent);

    return {
      intent: intentResult.intent,
      agent,
      entities: intentResult.entities,
      confidence: intentResult.confidence,
    };
  }

  /**
   * 인텐트를 에이전트 이름에 매핑한다.
   *
   * @param intent - 인텐트 유형
   * @returns 에이전트 이름
   */
  private mapIntentToAgent(intent: string): string {
    const intentAgentMap: Record<string, string> = {
      schedule: 'schedule',
      project: 'project',
      document: 'document',
      knowledge: 'knowledge',
      file: 'file',
    };

    return intentAgentMap[intent] ?? 'general';
  }
}
