import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectSyncEntity } from './entities/project-sync.entity';
import { ClickUpService } from '../../core/clickup/clickup.service';
import { ClickUpTaskResponseDto } from '../../core/clickup/dto/clickup-task.response.dto';
import { CreateClickUpTaskRequestDto } from '../../core/clickup/dto/create-clickup-task.request.dto';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';

/**
 * 프로젝트 에이전트 서비스.
 * ClickUp Space와 로컬 프로젝트 동기화, 태스크 CRUD를 담당한다.
 */
@Injectable()
export class ProjectAgentService {
  private readonly logger = new Logger(ProjectAgentService.name);

  constructor(
    @InjectRepository(ProjectSyncEntity)
    private readonly projectSyncRepository: Repository<ProjectSyncEntity>,
    private readonly clickUpService: ClickUpService,
    private readonly aiGatewayService: AiGatewayService,
  ) {}

  /**
   * ClickUp Space 목록을 조회하고 로컬 동기화 상태를 업데이트한다.
   *
   * @returns 동기화된 프로젝트 목록
   */
  async syncProjects(): Promise<ProjectSyncEntity[]> {
    this.logger.log('ClickUp Space 동기화 시작');

    const spaces = await this.clickUpService.getSpaces();
    const syncEntities: ProjectSyncEntity[] = [];

    for (const space of spaces) {
      let syncEntity = await this.projectSyncRepository.findOne({
        where: { clickupSpaceId: space.id },
      });

      if (syncEntity) {
        syncEntity.markSynced(space.name);
      } else {
        syncEntity = this.projectSyncRepository.create({
          clickupSpaceId: space.id,
          name: space.name,
          lastSyncAt: new Date(),
          status: 'SYNCED',
        });
      }

      syncEntities.push(await this.projectSyncRepository.save(syncEntity));
    }

    this.logger.log(`ClickUp Space 동기화 완료: ${syncEntities.length}개`);
    return syncEntities;
  }

  /**
   * 특정 ClickUp List의 태스크 목록을 조회한다.
   *
   * @param listId - ClickUp List ID
   * @returns 태스크 목록
   */
  async getTasks(listId: string): Promise<ClickUpTaskResponseDto[]> {
    return this.clickUpService.getTasks(listId);
  }

  /**
   * ClickUp에 새 태스크를 생성한다.
   *
   * @param dto - 태스크 생성 정보
   * @returns 생성된 태스크
   */
  async createTask(dto: CreateClickUpTaskRequestDto): Promise<ClickUpTaskResponseDto> {
    this.logger.log(`ClickUp 태스크 생성: ${dto.name}`);
    return this.clickUpService.createTask(dto);
  }

  /**
   * 자연어 메시지를 분석하여 ClickUp 작업으로 변환한다.
   * 현재는 stub 구현으로 메시지를 그대로 반환한다.
   *
   * @param message - 사용자 자연어 메시지
   * @returns 처리 결과 메시지
   */
  async processNaturalLanguage(message: string): Promise<string> {
    this.logger.log(`자연어 처리 요청: ${message}`);

    const response = await this.aiGatewayService.chat([
      {
        role: 'system',
        content: `사용자의 자연어 메시지를 분석하여 ClickUp 태스크로 변환하세요.
JSON 형식으로 응답하세요:
{"name": "태스크 제목", "description": "태스크 설명", "priority": 3, "dueDate": "ISO 8601 또는 null"}
priority: 1=긴급, 2=높음, 3=보통, 4=낮음`,
      },
      { role: 'user', content: message },
    ]);

    try {
      const parsed = JSON.parse(response.content);
      const dto = new CreateClickUpTaskRequestDto();
      dto.name = parsed.name;
      dto.description = parsed.description;
      dto.listId = ''; // 호출 시 listId를 별도로 지정해야 함
      dto.priority = parsed.priority;
      dto.dueDate = parsed.dueDate ?? undefined;

      this.logger.log(`자연어 → 태스크 변환 완료: ${dto.name}`);
      return `태스크 변환 완료: "${dto.name}" (priority=${dto.priority})`;
    } catch {
      this.logger.warn(`AI 응답 파싱 실패, 원본 반환: ${response.content}`);
      return `태스크 변환 결과: ${response.content}`;
    }
  }
}
