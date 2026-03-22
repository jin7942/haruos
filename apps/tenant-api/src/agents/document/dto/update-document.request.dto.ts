import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** 문서 수정 요청 DTO. */
export class UpdateDocumentRequestDto {
  @ApiPropertyOptional({ description: '문서 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '문서 내용 (Markdown)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '상태 변경',
    enum: ['PUBLISHED', 'ARCHIVED'],
  })
  @IsOptional()
  @IsIn(['PUBLISHED', 'ARCHIVED'])
  status?: string;
}
