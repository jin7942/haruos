import { Injectable } from '@nestjs/common';
import { ClickUpApiPort } from './ports/clickup-api.port';
import { CreateClickUpTaskRequestDto } from './dto/create-clickup-task.request.dto';
import {
  ClickUpTaskResponseDto,
  ClickUpSpaceResponseDto,
  ClickUpListResponseDto,
} from './dto/clickup-task.response.dto';

/**
 * ClickUp 서비스.
 * ClickUpApiPort를 통해 ClickUp API에 접근한다.
 */
@Injectable()
export class ClickUpService {
  constructor(private readonly clickUpApi: ClickUpApiPort) {}

  /**
   * 태스크 목록을 조회한다.
   *
   * @param listId - ClickUp List ID
   * @returns 태스크 목록
   */
  async getTasks(listId: string): Promise<ClickUpTaskResponseDto[]> {
    return this.clickUpApi.getTasks(listId);
  }

  /**
   * 태스크를 생성한다.
   *
   * @param dto - 태스크 생성 정보
   * @returns 생성된 태스크
   */
  async createTask(dto: CreateClickUpTaskRequestDto): Promise<ClickUpTaskResponseDto> {
    return this.clickUpApi.createTask(dto);
  }

  /**
   * 태스크를 수정한다.
   *
   * @param taskId - ClickUp 태스크 ID
   * @param data - 수정할 필드
   * @returns 수정된 태스크
   */
  async updateTask(
    taskId: string,
    data: Partial<CreateClickUpTaskRequestDto>,
  ): Promise<ClickUpTaskResponseDto> {
    return this.clickUpApi.updateTask(taskId, data);
  }

  /**
   * 워크스페이스의 Space 목록을 조회한다.
   *
   * @returns Space 목록
   */
  async getSpaces(): Promise<ClickUpSpaceResponseDto[]> {
    return this.clickUpApi.getSpaces();
  }

  /**
   * Space의 List 목록을 조회한다.
   *
   * @param spaceId - ClickUp Space ID
   * @returns List 목록
   */
  async getLists(spaceId: string): Promise<ClickUpListResponseDto[]> {
    return this.clickUpApi.getLists(spaceId);
  }
}
