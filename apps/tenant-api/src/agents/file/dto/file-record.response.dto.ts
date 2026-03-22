import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { File } from '../entities/file.entity';

/** 파일 응답 DTO. */
export class FileRecordResponseDto {
  @ApiProperty({ description: '파일 ID' })
  id: string;

  @ApiProperty({ description: '원본 파일명' })
  originalName: string;

  @ApiProperty({ description: 'MIME 타입' })
  mimeType: string;

  @ApiProperty({ description: '파일 크기 (bytes)' })
  sizeBytes: string;

  @ApiProperty({ description: '파일 상태' })
  status: string;

  @ApiPropertyOptional({ description: '카테고리' })
  category: string | null;

  @ApiProperty({ description: '생성일시' })
  createdAt: string;

  /**
   * File 엔티티에서 DTO로 변환한다.
   *
   * @param entity - File 엔티티
   */
  static from(entity: File): FileRecordResponseDto {
    const dto = new FileRecordResponseDto();
    dto.id = entity.id;
    dto.originalName = entity.originalName;
    dto.mimeType = entity.mimeType;
    dto.sizeBytes = entity.sizeBytes;
    dto.status = entity.status;
    dto.category = entity.category;
    dto.createdAt = entity.createdAt.toISOString();
    return dto;
  }
}
