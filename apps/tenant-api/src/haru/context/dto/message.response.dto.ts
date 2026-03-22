import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Message } from '../entities/message.entity';

/** 메시지 응답 DTO. */
export class MessageResponseDto {
  @ApiProperty({ description: '메시지 ID' })
  id: string;

  @ApiProperty({ description: '메시지 역할 (user/assistant/system)' })
  role: string;

  @ApiProperty({ description: '메시지 내용' })
  content: string;

  @ApiPropertyOptional({ description: '메타데이터' })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: '생성 시각 (ISO 8601)' })
  createdAt: string;

  /**
   * Message 엔티티에서 변환.
   *
   * @param entity - Message 엔티티
   */
  static from(entity: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = entity.id;
    dto.role = entity.role;
    dto.content = entity.content;
    dto.metadata = entity.metadata;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
