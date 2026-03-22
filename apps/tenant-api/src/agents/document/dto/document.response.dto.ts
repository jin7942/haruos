import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document } from '../entities/document.entity';

/** 문서 응답 DTO. */
export class DocumentResponseDto {
  @ApiProperty({ description: '문서 ID' })
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '문서 제목' })
  title: string;

  @ApiPropertyOptional({ description: '문서 내용' })
  content: string | null;

  @ApiProperty({ description: '문서 타입', enum: ['MEETING_NOTE', 'SUMMARY', 'ACTION_ITEM'] })
  type: string;

  @ApiProperty({ description: '문서 상태', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  status: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정일시' })
  updatedAt: Date;

  /**
   * Document 엔티티에서 DTO로 변환한다.
   *
   * @param entity - Document 엔티티
   * @returns DocumentResponseDto
   */
  static from(entity: Document): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.title = entity.title;
    dto.content = entity.content;
    dto.type = entity.type;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
