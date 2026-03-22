import { ApiProperty } from '@nestjs/swagger';
import { FileRecordEntity } from '../entities/file-record.entity';

/** 파일 레코드 응답 DTO. */
export class FileRecordResponseDto {
  @ApiProperty({ description: '파일 레코드 ID' })
  id: string;

  @ApiProperty({ description: '파일명' })
  fileName: string;

  @ApiProperty({ description: 'MIME 타입' })
  mimeType: string;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  size: string;

  @ApiProperty({ description: '업로드 일시' })
  uploadedAt: Date;

  /**
   * FileRecordEntity에서 DTO로 변환한다.
   *
   * @param entity - FileRecordEntity
   * @returns FileRecordResponseDto
   */
  static from(entity: FileRecordEntity): FileRecordResponseDto {
    const dto = new FileRecordResponseDto();
    dto.id = entity.id;
    dto.fileName = entity.fileName;
    dto.mimeType = entity.mimeType;
    dto.size = entity.size;
    dto.uploadedAt = entity.uploadedAt;
    return dto;
  }
}
