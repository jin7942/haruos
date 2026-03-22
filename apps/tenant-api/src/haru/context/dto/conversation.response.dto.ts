import { ApiProperty } from '@nestjs/swagger';
import { Conversation } from '../entities/conversation.entity';

/** 대화 응답 DTO. */
export class ConversationResponseDto {
  @ApiProperty({ description: '대화 ID' })
  id: string;

  @ApiProperty({ description: '대화 제목' })
  title: string | null;

  @ApiProperty({ description: '생성 시각 (ISO 8601)' })
  createdAt: string;

  @ApiProperty({ description: '수정 시각 (ISO 8601)' })
  updatedAt: string;

  /**
   * Conversation 엔티티에서 변환.
   *
   * @param entity - Conversation 엔티티
   */
  static from(entity: Conversation): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
