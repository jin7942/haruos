import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 문서 변환 요청 DTO. */
export class ConvertDocumentRequestDto {
  @ApiProperty({ description: 'Markdown 원문' })
  @IsString()
  markdown: string;

  @ApiPropertyOptional({ description: '출력 파일명 (확장자 제외)', example: 'report' })
  @IsOptional()
  @IsString()
  filename?: string;
}
