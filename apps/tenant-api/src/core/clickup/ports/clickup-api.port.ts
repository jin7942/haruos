import { CreateClickUpTaskRequestDto } from '../dto/create-clickup-task.request.dto';
import {
  ClickUpTaskResponseDto,
  ClickUpSpaceResponseDto,
  ClickUpListResponseDto,
} from '../dto/clickup-task.response.dto';

/**
 * ClickUp API 연동 포트.
 * ClickUp REST API 호출을 추상화한다.
 */
export abstract class ClickUpApiPort {
  /**
   * 태스크 목록을 조회한다.
   *
   * @param listId - ClickUp List ID
   * @returns 태스크 목록
   */
  abstract getTasks(listId: string): Promise<ClickUpTaskResponseDto[]>;

  /**
   * 태스크를 생성한다.
   *
   * @param dto - 태스크 생성 정보
   * @returns 생성된 태스크
   */
  abstract createTask(dto: CreateClickUpTaskRequestDto): Promise<ClickUpTaskResponseDto>;

  /**
   * 태스크를 수정한다.
   *
   * @param taskId - ClickUp 태스크 ID
   * @param data - 수정할 필드
   * @returns 수정된 태스크
   */
  abstract updateTask(
    taskId: string,
    data: Partial<CreateClickUpTaskRequestDto>,
  ): Promise<ClickUpTaskResponseDto>;

  /**
   * 워크스페이스의 Space 목록을 조회한다.
   *
   * @returns Space 목록
   */
  abstract getSpaces(): Promise<ClickUpSpaceResponseDto[]>;

  /**
   * Space의 List 목록을 조회한다.
   *
   * @param spaceId - ClickUp Space ID
   * @returns List 목록
   */
  abstract getLists(spaceId: string): Promise<ClickUpListResponseDto[]>;
}
