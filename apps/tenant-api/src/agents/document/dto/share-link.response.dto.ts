import { ApiProperty } from '@nestjs/swagger';

/** 문서 공유 링크 응답 DTO. */
export class ShareLinkResponseDto {
  @ApiProperty({ description: '공유용 Presigned URL' })
  url: string;

  @ApiProperty({ description: 'URL 만료 시간 (초)', example: 3600 })
  expiresIn: number;

  /**
   * 팩토리 메서드.
   *
   * @param url - presigned URL
   * @param expiresIn - 만료 시간 (초)
   */
  static of(url: string, expiresIn: number): ShareLinkResponseDto {
    const dto = new ShareLinkResponseDto();
    dto.url = url;
    dto.expiresIn = expiresIn;
    return dto;
  }
}
