import { ApiProperty } from '@nestjs/swagger';

/** RAG 답변의 출처 청크 정보. */
export class SourceChunkDto {
  @ApiProperty({ description: '청크 ID' })
  chunkId: string;

  @ApiProperty({ description: '원본 문서 ID' })
  documentId: string;

  @ApiProperty({ description: '청크 내용 (발췌)' })
  content: string;

  @ApiProperty({ description: '유사도 점수 (0.0 ~ 1.0)' })
  score: number;

  /**
   * 출처 청크 DTO를 생성한다.
   *
   * @param chunkId - 청크 ID
   * @param documentId - 문서 ID
   * @param content - 청크 내용
   * @param score - 유사도 점수
   */
  static from(chunkId: string, documentId: string, content: string, score: number): SourceChunkDto {
    const dto = new SourceChunkDto();
    dto.chunkId = chunkId;
    dto.documentId = documentId;
    dto.content = content;
    dto.score = score;
    return dto;
  }
}

/** RAG 질의 응답 DTO. AI 답변과 출처 청크 목록을 포함한다. */
export class AskQuestionResponseDto {
  @ApiProperty({ description: 'AI 생성 답변' })
  answer: string;

  @ApiProperty({ description: '답변 근거 출처 청크 목록', type: [SourceChunkDto] })
  sources: SourceChunkDto[];

  /**
   * 응답 DTO를 생성한다.
   *
   * @param answer - AI 답변 텍스트
   * @param sources - 출처 청크 목록
   */
  static from(answer: string, sources: SourceChunkDto[]): AskQuestionResponseDto {
    const dto = new AskQuestionResponseDto();
    dto.answer = answer;
    dto.sources = sources;
    return dto;
  }
}
