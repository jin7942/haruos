import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 문서 인덱싱 요청 DTO. */
export class IndexDocumentRequestDto {
  @ApiProperty({ description: '인덱싱할 문서 ID' })
  @IsString()
  documentId: string;
}
