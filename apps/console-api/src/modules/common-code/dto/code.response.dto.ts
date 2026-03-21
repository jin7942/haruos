import { ApiProperty } from '@nestjs/swagger';
import { CodeEntity } from '../entities/code.entity';

/** 개별 코드 응답. */
export class CodeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupCode: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isEnabled: boolean;

  @ApiProperty({ required: false })
  metadata: Record<string, unknown> | null;

  /** @param entity - CodeEntity에서 변환 */
  static from(entity: CodeEntity): CodeResponseDto {
    const dto = new CodeResponseDto();
    dto.id = entity.id;
    dto.groupCode = entity.groupCode;
    dto.code = entity.code;
    dto.name = entity.name;
    dto.sortOrder = entity.sortOrder;
    dto.isEnabled = entity.isEnabled;
    dto.metadata = entity.metadata;
    return dto;
  }
}
