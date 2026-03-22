import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** ClickUp 태스크 생성 요청 DTO. */
export class CreateClickUpTaskRequestDto {
  @ApiProperty({ description: '태스크 제목' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '태스크 설명 (Markdown)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ClickUp List ID' })
  @IsString()
  listId: string;

  @ApiPropertyOptional({ description: '담당자 ID' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: '마감일 (ISO 8601)' })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ description: '우선순위 (1=긴급, 2=높음, 3=보통, 4=낮음)' })
  @IsOptional()
  priority?: number;
}
