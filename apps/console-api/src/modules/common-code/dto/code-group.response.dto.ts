import { ApiProperty } from '@nestjs/swagger';
import { CodeGroupEntity } from '../entities/code-group.entity';
import { CodeResponseDto } from './code.response.dto';

/** 코드 그룹 응답. 하위 코드 목록 포함. */
export class CodeGroupResponseDto {
  @ApiProperty()
  groupCode: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string | null;

  @ApiProperty({ type: [CodeResponseDto], required: false })
  codes?: CodeResponseDto[];

  /** @param entity - CodeGroupEntity에서 변환 */
  static from(entity: CodeGroupEntity, codes?: CodeResponseDto[]): CodeGroupResponseDto {
    const dto = new CodeGroupResponseDto();
    dto.groupCode = entity.groupCode;
    dto.name = entity.name;
    dto.description = entity.description;
    if (codes) dto.codes = codes;
    return dto;
  }
}
