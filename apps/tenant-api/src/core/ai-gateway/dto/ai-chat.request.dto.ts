import { IsString, IsArray, ValidateNested, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 채팅 메시지 단위. */
export class ChatMessageDto {
  @ApiProperty({ description: '메시지 역할', enum: ['system', 'user', 'assistant'] })
  @IsString()
  role: 'system' | 'user' | 'assistant';

  @ApiProperty({ description: '메시지 내용' })
  @IsString()
  content: string;
}

/** AI 모델 호출 옵션. */
export class AiOptionsDto {
  @ApiPropertyOptional({ description: '응답 최대 토큰 수', default: 1024 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4096)
  maxTokens?: number;

  @ApiPropertyOptional({ description: '응답 창의성 (0.0 ~ 1.0)', default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;
}

/** AI 채팅 요청 DTO. */
export class AiChatRequestDto {
  @ApiProperty({ description: '대화 메시지 목록', type: [ChatMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @ApiPropertyOptional({ description: 'AI 모델 옵션', type: AiOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiOptionsDto)
  options?: AiOptionsDto;
}
