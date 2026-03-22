import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectSyncEntity } from '../entities/project-sync.entity';

/** 프로젝트 동기화 상태 응답 DTO. */
export class ProjectSyncResponseDto {
  @ApiProperty({ description: '동기화 레코드 ID' })
  id: string;

  @ApiProperty({ description: 'ClickUp Space ID' })
  clickupSpaceId: string;

  @ApiProperty({ description: 'Space 이름' })
  name: string;

  @ApiPropertyOptional({ description: '마지막 동기화 일시' })
  lastSyncAt: Date | null;

  @ApiProperty({ description: '동기화 상태' })
  status: string;

  /**
   * ProjectSyncEntity에서 DTO로 변환한다.
   *
   * @param entity - ProjectSyncEntity
   * @returns ProjectSyncResponseDto
   */
  static from(entity: ProjectSyncEntity): ProjectSyncResponseDto {
    const dto = new ProjectSyncResponseDto();
    dto.id = entity.id;
    dto.clickupSpaceId = entity.clickupSpaceId;
    dto.name = entity.name;
    dto.lastSyncAt = entity.lastSyncAt;
    dto.status = entity.status;
    return dto;
  }
}
