import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document } from '../entities/document.entity';

/** 문서 응답 DTO. */
export class DocumentResponseDto {
  @ApiProperty({ description: '문서 ID' })
  id: string;

  @ApiProperty({ description: '생성자 ID' })
  createdBy: string;

  @ApiProperty({ description: '문서 제목' })
  title: string;

  @ApiPropertyOptional({ description: '문서 내용' })
  content: string | null;

  @ApiPropertyOptional({ description: '문서 요약' })
  summary: string | null;

  @ApiProperty({ description: '문서 타입', enum: ['GENERAL', 'MEETING_NOTE', 'SUMMARY', 'ACTION_ITEM'] })
  type: string;

  @ApiProperty({ description: '문서 상태', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  status: string;

  @ApiProperty({ description: '생성일시' })
  createdAt: string;

  /**
   * Document 엔티티에서 DTO로 변환한다.
   *
   * @param entity - Document 엔티티
   */
  static from(entity: Document): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = entity.id;
    dto.createdBy = entity.createdBy;
    dto.title = entity.title;
    dto.content = entity.content;
    dto.summary = entity.summary;
    dto.type = entity.type;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
