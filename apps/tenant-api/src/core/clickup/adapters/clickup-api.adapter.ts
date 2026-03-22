import { Injectable, Logger } from '@nestjs/common';
import { ClickUpApiPort } from '../ports/clickup-api.port';
import { CreateClickUpTaskRequestDto } from '../dto/create-clickup-task.request.dto';
import {
  ClickUpTaskResponseDto,
  ClickUpSpaceResponseDto,
  ClickUpListResponseDto,
} from '../dto/clickup-task.response.dto';

/**
 * ClickUp API 어댑터 (stub).
 * 프로덕션에서는 ClickUp REST API를 호출한다.
 */
@Injectable()
export class ClickUpApiAdapter extends ClickUpApiPort {
  private readonly logger = new Logger(ClickUpApiAdapter.name);

  /** {@inheritDoc ClickUpApiPort.getTasks} */
  async getTasks(listId: string): Promise<ClickUpTaskResponseDto[]> {
    this.logger.warn(`[Stub] ClickUp getTasks: listId=${listId}`);
    return [];
  }

  /** {@inheritDoc ClickUpApiPort.createTask} */
  async createTask(dto: CreateClickUpTaskRequestDto): Promise<ClickUpTaskResponseDto> {
    this.logger.warn(`[Stub] ClickUp createTask: name=${dto.name}, listId=${dto.listId}`);
    return ClickUpTaskResponseDto.from({
      id: 'stub-task-id',
      name: dto.name,
      description: dto.description,
      status: 'Open',
      dueDate: dto.dueDate,
      priority: dto.priority,
      url: `https://app.clickup.com/t/stub-task-id`,
    });
  }

  /** {@inheritDoc ClickUpApiPort.updateTask} */
  async updateTask(
    taskId: string,
    data: Partial<CreateClickUpTaskRequestDto>,
  ): Promise<ClickUpTaskResponseDto> {
    this.logger.warn(`[Stub] ClickUp updateTask: taskId=${taskId}`);
    return ClickUpTaskResponseDto.from({
      id: taskId,
      name: data.name || 'Updated Task',
      status: 'In Progress',
      url: `https://app.clickup.com/t/${taskId}`,
    });
  }

  /** {@inheritDoc ClickUpApiPort.getSpaces} */
  async getSpaces(): Promise<ClickUpSpaceResponseDto[]> {
    this.logger.warn('[Stub] ClickUp getSpaces');
    return [];
  }

  /** {@inheritDoc ClickUpApiPort.getLists} */
  async getLists(spaceId: string): Promise<ClickUpListResponseDto[]> {
    this.logger.warn(`[Stub] ClickUp getLists: spaceId=${spaceId}`);
    return [];
  }
}
