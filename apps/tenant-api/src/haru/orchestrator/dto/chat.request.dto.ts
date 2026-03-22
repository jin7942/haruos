import { IsString, IsOptional, IsUUID, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 대화 메시지 요청 DTO. */
export class ChatRequestDto {
  @ApiProperty({ description: '사용자 메시지', example: '내일 오전 10시에 회의 일정 잡아줘' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;

  @ApiPropertyOptional({ description: '대화 ID (없으면 새 대화 생성)' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
