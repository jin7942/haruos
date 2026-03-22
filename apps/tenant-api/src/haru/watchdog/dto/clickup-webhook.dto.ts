import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** ClickUp 웹훅 수신 DTO. */
export class ClickUpWebhookDto {
  @ApiProperty({ description: '웹훅 이벤트 타입 (예: taskCreated, taskUpdated)' })
  @IsString()
  event: string;

  @ApiPropertyOptional({ description: '웹훅 ID' })
  @IsOptional()
  @IsString()
  webhook_id?: string;

  @ApiProperty({ description: '이벤트 상세 데이터' })
  history_items: Record<string, unknown>[];

  @ApiPropertyOptional({ description: '태스크 ID' })
  @IsOptional()
  @IsString()
  task_id?: string;
}
