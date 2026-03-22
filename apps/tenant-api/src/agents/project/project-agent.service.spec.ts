import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAgentService } from './project-agent.service';
import { ProjectSyncEntity } from './entities/project-sync.entity';
import { ClickUpService } from '../../core/clickup/clickup.service';
import { AiGatewayService } from '../../core/ai-gateway/ai-gateway.service';
import { ClickUpSpaceResponseDto } from '../../core/clickup/dto/clickup-task.response.dto';

describe('ProjectAgentService', () => {
  let service: ProjectAgentService;
  let syncRepo: jest.Mocked<Repository<ProjectSyncEntity>>;
  let clickUpService: jest.Mocked<ClickUpService>;
  let aiGatewayService: jest.Mocked<AiGatewayService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAgentService,
        {
          provide: getRepositoryToken(ProjectSyncEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ClickUpService,
          useValue: {
            getSpaces: jest.fn(),
            getTasks: jest.fn(),
            createTask: jest.fn(),
          },
        },
        {
          provide: AiGatewayService,
          useValue: {
            chat: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ProjectAgentService);
    syncRepo = module.get(getRepositoryToken(ProjectSyncEntity));
    clickUpService = module.get(ClickUpService);
    aiGatewayService = module.get(AiGatewayService);
  });

  describe('syncProjects', () => {
    it('ClickUp Space를 동기화하고 새 엔티티를 생성한다', async () => {
      const space = ClickUpSpaceResponseDto.from('space-1', 'Test Space');
      clickUpService.getSpaces.mockResolvedValue([space]);
      syncRepo.findOne.mockResolvedValue(null);
      syncRepo.create.mockReturnValue({
        clickupSpaceId: 'space-1',
        name: 'Test Space',
        lastSyncAt: new Date(),
        status: 'SYNCED',
      } as ProjectSyncEntity);
      syncRepo.save.mockImplementation((entity) =>
        Promise.resolve({ id: 'sync-1', ...entity } as ProjectSyncEntity),
      );

      const result = await service.syncProjects();

      expect(result).toHaveLength(1);
      expect(result[0].clickupSpaceId).toBe('space-1');
      expect(syncRepo.create).toHaveBeenCalled();
    });

    it('이미 존재하는 Space를 업데이트한다', async () => {
      const space = ClickUpSpaceResponseDto.from('space-1', 'Updated Name');
      clickUpService.getSpaces.mockResolvedValue([space]);

      const existing = Object.assign(new ProjectSyncEntity(), {
        id: 'sync-1',
        clickupSpaceId: 'space-1',
        name: 'Old Name',
        lastSyncAt: null,
        status: 'SYNCED',
      });
      syncRepo.findOne.mockResolvedValue(existing);
      syncRepo.save.mockImplementation((entity) => Promise.resolve(entity as ProjectSyncEntity));

      const result = await service.syncProjects();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Updated Name');
      expect(result[0].lastSyncAt).toBeDefined();
    });
  });

  describe('getTasks', () => {
    it('ClickUp 태스크 목록을 반환한다', async () => {
      const mockTasks = [{ id: 't-1', name: 'Task 1', status: 'open', url: 'https://...' }];
      clickUpService.getTasks.mockResolvedValue(mockTasks as any);

      const result = await service.getTasks('list-1');

      expect(result).toEqual(mockTasks);
      expect(clickUpService.getTasks).toHaveBeenCalledWith('list-1');
    });
  });

  describe('processNaturalLanguage', () => {
    it('AI 응답을 파싱하여 태스크 변환 결과를 반환한다', async () => {
      aiGatewayService.chat.mockResolvedValue({
        content: JSON.stringify({ name: '회의 일정', description: '내일 회의', priority: 3, dueDate: null }),
        model: 'claude-sonnet',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await service.processNaturalLanguage('내일 회의 일정 잡아줘');

      expect(result).toContain('태스크 변환 완료');
      expect(result).toContain('회의 일정');
      expect(aiGatewayService.chat).toHaveBeenCalled();
    });

    it('AI 응답 파싱 실패 시 원본 반환', async () => {
      aiGatewayService.chat.mockResolvedValue({
        content: 'invalid json',
        model: 'claude-sonnet',
        usage: { inputTokens: 100, outputTokens: 50 },
      });

      const result = await service.processNaturalLanguage('잘못된 요청');

      expect(result).toContain('태스크 변환 결과');
      expect(result).toContain('invalid json');
    });
  });
});
