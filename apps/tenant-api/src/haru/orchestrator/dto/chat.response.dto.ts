import { ApiProperty } from '@nestjs/swagger';

/** 에이전트가 수행한 액션. */
export class ActionVo {
  @ApiProperty({ description: '액션 타입 (예: create_schedule, search_document)' })
  type: string;

  @ApiProperty({ description: '액션 상세 데이터' })
  data: Record<string, unknown>;

  static of(type: string, data: Record<string, unknown>): ActionVo {
    const vo = new ActionVo();
    vo.type = type;
    vo.data = data;
    return vo;
  }
}

/** 대화 응답 DTO. */
export class ChatResponseDto {
  @ApiProperty({ description: 'AI 응답 텍스트' })
  response: string;

  @ApiProperty({ description: '처리한 에이전트 이름' })
  agent: string;

  @ApiProperty({ description: '대화 ID' })
  conversationId: string;

  @ApiProperty({ description: '수행된 액션 목록', type: [ActionVo] })
  actions: ActionVo[];

  /**
   * ChatResponseDto 생성.
   *
   * @param response - AI 응답 텍스트
   * @param agent - 처리한 에이전트 이름
   * @param conversationId - 대화 ID
   * @param actions - 수행된 액션 목록
   */
  static from(
    response: string,
    agent: string,
    conversationId: string,
    actions: ActionVo[] = [],
  ): ChatResponseDto {
    const dto = new ChatResponseDto();
    dto.response = response;
    dto.agent = agent;
    dto.conversationId = conversationId;
    dto.actions = actions;
    return dto;
  }
}
