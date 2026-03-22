import { ApiProperty } from '@nestjs/swagger';

/** 파일 정리 결과 응답 DTO. */
export class OrganizeFilesResponseDto {
  @ApiProperty({ description: '카테고리 부여된 파일 수' })
  organized: number;

  @ApiProperty({ description: '건너뛴 파일 수' })
  skipped: number;

  @ApiProperty({ description: 'ZIP 해제된 파일 수' })
  extracted: number;

  @ApiProperty({ description: '오류 메시지 목록', type: [String] })
  errors: string[];

  /**
   * OrganizeResult에서 DTO로 변환한다.
   *
   * @param result - 정리 결과
   */
  static from(result: { organized: number; skipped: number; extracted: number; errors: string[] }): OrganizeFilesResponseDto {
    const dto = new OrganizeFilesResponseDto();
    dto.organized = result.organized;
    dto.skipped = result.skipped;
    dto.extracted = result.extracted;
    dto.errors = result.errors;
    return dto;
  }
}
