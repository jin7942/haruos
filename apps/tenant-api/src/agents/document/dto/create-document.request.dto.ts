import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 문서 생성 요청 DTO. */
export class CreateDocumentRequestDto {
  @ApiProperty({ description: '문서 제목' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '문서 내용 (Markdown)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: '문서 타입',
    enum: ['MEETING_NOTE', 'SUMMARY', 'ACTION_ITEM'],
  })
  @IsIn(['MEETING_NOTE', 'SUMMARY', 'ACTION_ITEM'])
  type: string;
}
