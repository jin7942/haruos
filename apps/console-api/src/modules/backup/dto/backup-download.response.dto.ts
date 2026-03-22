import { ApiProperty } from '@nestjs/swagger';

/** 백업 다운로드 URL 응답 DTO. */
export class BackupDownloadResponseDto {
  @ApiProperty({ description: '다운로드 URL (presigned)' })
  url: string;

  @ApiProperty({ description: 'URL 만료 시간 (초)', example: 3600 })
  expiresIn: number;

  /**
   * 팩토리 메서드.
   *
   * @param url - presigned URL
   * @param expiresIn - 만료 시간 (초)
   */
  static of(url: string, expiresIn: number): BackupDownloadResponseDto {
    const dto = new BackupDownloadResponseDto();
    dto.url = url;
    dto.expiresIn = expiresIn;
    return dto;
  }
}
