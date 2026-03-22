import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProjectAgentService } from './project-agent.service';
import { SyncProjectRequestDto } from './dto/sync-project.request.dto';
import { ProjectSyncResponseDto } from './dto/project-sync.response.dto';
import { ClickUpTaskResponseDto } from '../../core/clickup/dto/clickup-task.response.dto';
import { CreateClickUpTaskRequestDto } from '../../core/clickup/dto/create-clickup-task.request.dto';

/**
 * 프로젝트 에이전트 컨트롤러.
 * ClickUp 프로젝트 동기화 및 태스크 관리 API를 제공한다.
 */
@ApiTags('Project Agent')
@ApiBearerAuth()
@Controller('agents/project')
export class ProjectController {
  constructor(private readonly projectAgentService: ProjectAgentService) {}

  /**
   * ClickUp Space를 동기화한다.
   *
   * @returns 동기화된 프로젝트 목록
   */
  @Post('sync')
  @ApiOperation({ summary: 'ClickUp Space 동기화' })
  @ApiResponse({ status: 201, type: [ProjectSyncResponseDto] })
  async syncProjects(): Promise<ProjectSyncResponseDto[]> {
    const entities = await this.projectAgentService.syncProjects();
    return entities.map(ProjectSyncResponseDto.from);
  }

  /**
   * ClickUp List의 태스크 목록을 조회한다.
   *
   * @param listId - ClickUp List ID
   * @returns 태스크 목록
   */
  @Get('tasks')
  @ApiOperation({ summary: 'ClickUp 태스크 목록 조회' })
  @ApiQuery({ name: 'listId', description: 'ClickUp List ID' })
  @ApiResponse({ status: 200, type: [ClickUpTaskResponseDto] })
  getTasks(@Query('listId') listId: string): Promise<ClickUpTaskResponseDto[]> {
    return this.projectAgentService.getTasks(listId);
  }

  /**
   * ClickUp에 태스크를 생성한다.
   *
   * @param dto - 태스크 생성 정보
   * @returns 생성된 태스크
   */
  @Post('tasks')
  @ApiOperation({ summary: 'ClickUp 태스크 생성' })
  @ApiResponse({ status: 201, type: ClickUpTaskResponseDto })
  createTask(@Body() dto: CreateClickUpTaskRequestDto): Promise<ClickUpTaskResponseDto> {
    return this.projectAgentService.createTask(dto);
  }
}
