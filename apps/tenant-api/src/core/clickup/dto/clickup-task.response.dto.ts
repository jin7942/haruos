import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** ClickUp 태스크 응답 DTO. */
export class ClickUpTaskResponseDto {
  @ApiProperty({ description: 'ClickUp 태스크 ID' })
  id: string;

  @ApiProperty({ description: '태스크 제목' })
  name: string;

  @ApiPropertyOptional({ description: '태스크 설명' })
  description?: string;

  @ApiProperty({ description: '태스크 상태' })
  status: string;

  @ApiPropertyOptional({ description: '마감일' })
  dueDate?: string;

  @ApiPropertyOptional({ description: '우선순위' })
  priority?: number;

  @ApiProperty({ description: 'ClickUp 태스크 URL' })
  url: string;

  static from(data: {
    id: string;
    name: string;
    description?: string;
    status: string;
    dueDate?: string;
    priority?: number;
    url: string;
  }): ClickUpTaskResponseDto {
    const dto = new ClickUpTaskResponseDto();
    dto.id = data.id;
    dto.name = data.name;
    dto.description = data.description;
    dto.status = data.status;
    dto.dueDate = data.dueDate;
    dto.priority = data.priority;
    dto.url = data.url;
    return dto;
  }
}

/** ClickUp Space 응답 DTO. */
export class ClickUpSpaceResponseDto {
  @ApiProperty({ description: 'Space ID' })
  id: string;

  @ApiProperty({ description: 'Space 이름' })
  name: string;

  static from(id: string, name: string): ClickUpSpaceResponseDto {
    const dto = new ClickUpSpaceResponseDto();
    dto.id = id;
    dto.name = name;
    return dto;
  }
}

/** ClickUp List 응답 DTO. */
export class ClickUpListResponseDto {
  @ApiProperty({ description: 'List ID' })
  id: string;

  @ApiProperty({ description: 'List 이름' })
  name: string;

  static from(id: string, name: string): ClickUpListResponseDto {
    const dto = new ClickUpListResponseDto();
    dto.id = id;
    dto.name = name;
    return dto;
  }
}
