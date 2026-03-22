import { ApiProperty } from '@nestjs/swagger';

/** ClickUp 동기화 결과 응답 DTO. */
export class ClickUpSyncResponseDto {
  @ApiProperty({ description: '동기화된 Space 수' })
  syncedSpaces: number;

  @ApiProperty({ description: '동기화된 Task 수' })
  syncedTasks: number;

  @ApiProperty({ description: '동기화 완료 시각 (ISO 8601)' })
  syncedAt: string;

  /**
   * 팩토리 메서드.
   *
   * @param syncedSpaces - 동기화된 Space 수
   * @param syncedTasks - 동기화된 Task 수
   */
  static of(syncedSpaces: number, syncedTasks: number): ClickUpSyncResponseDto {
    const dto = new ClickUpSyncResponseDto();
    dto.syncedSpaces = syncedSpaces;
    dto.syncedTasks = syncedTasks;
    dto.syncedAt = new Date().toISOString();
    return dto;
  }
}
