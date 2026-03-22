import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 배치 작업 생성 요청 DTO. */
export class CreateBatchJobRequestDto {
  @ApiProperty({ description: '작업 이름', example: '일일 리포트 생성' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: '작업 설명' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Cron 표현식',
    example: '0 9 * * 1-5',
  })
  @IsString()
  @Matches(/^(\S+\s+){4}\S+$/, { message: 'Invalid cron expression format' })
  cronExpression: string;
}
