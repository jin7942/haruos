import { ApiProperty } from '@nestjs/swagger';

/** 문서 변환 결과 응답 DTO. */
export class DocumentResultResponseDto {
  @ApiProperty({ description: '출력 파일명' })
  filename: string;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  size: number;

  @ApiProperty({ description: 'Content-Type' })
  contentType: string;

  static from(filename: string, size: number, contentType: string): DocumentResultResponseDto {
    const dto = new DocumentResultResponseDto();
    dto.filename = filename;
    dto.size = size;
    dto.contentType = contentType;
    return dto;
  }
}
