import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/** 지식 검색 요청 DTO. */
export class SearchKnowledgeRequestDto {
  @ApiProperty({ description: '검색 쿼리' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: '최대 결과 수 (기본: 10)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
