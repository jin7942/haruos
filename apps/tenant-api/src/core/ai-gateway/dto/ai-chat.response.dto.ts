import { ApiProperty } from '@nestjs/swagger';

/** AI 채팅 응답 DTO. */
export class AiChatResponseDto {
  @ApiProperty({ description: 'AI 응답 텍스트' })
  content: string;

  @ApiProperty({ description: '사용된 모델 ID' })
  model: string;

  @ApiProperty({ description: '사용된 토큰 수' })
  usage: {
    inputTokens: number;
    outputTokens: number;
  };

  static from(content: string, model: string, inputTokens: number, outputTokens: number): AiChatResponseDto {
    const dto = new AiChatResponseDto();
    dto.content = content;
    dto.model = model;
    dto.usage = { inputTokens, outputTokens };
    return dto;
  }
}

/** 인텐트 추출 결과. */
export class IntentResultDto {
  @ApiProperty({ description: '추출된 인텐트 (예: schedule, document, project)' })
  intent: string;

  @ApiProperty({ description: '인텐트 신뢰도 (0.0 ~ 1.0)' })
  confidence: number;

  @ApiProperty({ description: '추출된 엔티티 (슬롯 값)' })
  entities: Record<string, string>;

  static from(intent: string, confidence: number, entities: Record<string, string>): IntentResultDto {
    const dto = new IntentResultDto();
    dto.intent = intent;
    dto.confidence = confidence;
    dto.entities = entities;
    return dto;
  }
}
