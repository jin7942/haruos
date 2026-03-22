import { ApiProperty } from '@nestjs/swagger';
import { DocumentChunk } from '../entities/document-chunk.entity';

/** 지식 검색 결과 응답 DTO. */
export class KnowledgeSearchResponseDto {
  @ApiProperty({ description: '청크 ID' })
  chunkId: string;

  @ApiProperty({ description: '원본 문서 ID' })
  documentId: string;

  @ApiProperty({ description: '청크 내용' })
  content: string;

  @ApiProperty({ description: '유사도 점수 (0.0 ~ 1.0)' })
  score: number;

  /**
   * DocumentChunk에서 DTO로 변환한다.
   *
   * @param chunk - DocumentChunk 엔티티
   * @param score - 유사도 점수
   * @returns KnowledgeSearchResponseDto
   */
  static from(chunk: DocumentChunk, score: number): KnowledgeSearchResponseDto {
    const dto = new KnowledgeSearchResponseDto();
    dto.chunkId = chunk.id;
    dto.documentId = chunk.documentId;
    dto.content = chunk.content;
    dto.score = score;
    return dto;
  }
}
