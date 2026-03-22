import { ApiProperty } from '@nestjs/swagger';

/** 파일 정보 응답 DTO. */
export class FileResponseDto {
  @ApiProperty({ description: '파일 저장 경로 (S3 key)' })
  key: string;

  @ApiProperty({ description: 'Presigned URL (다운로드용)' })
  url: string;

  static from(key: string, url: string): FileResponseDto {
    const dto = new FileResponseDto();
    dto.key = key;
    dto.url = url;
    return dto;
  }
}
