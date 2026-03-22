import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 파일 업로드 요청 DTO. */
export class UploadFileRequestDto {
  @ApiProperty({ description: '저장 경로 (S3 key)', example: 'documents/report.pdf' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ description: 'Content-Type', example: 'application/pdf' })
  @IsOptional()
  @IsString()
  contentType?: string;
}
