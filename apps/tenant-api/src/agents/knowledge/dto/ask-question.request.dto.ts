import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** RAG 질의 요청 DTO. */
export class AskQuestionRequestDto {
  @ApiProperty({ description: '질문 내용', example: '최근 회의에서 결정된 사항이 무엇인가요?' })
  @IsString()
  @MinLength(2)
  question: string;
}
