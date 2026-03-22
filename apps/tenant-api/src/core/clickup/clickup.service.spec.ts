import { Test, TestingModule } from '@nestjs/testing';
import { ClickUpService } from './clickup.service';
import { ClickUpApiPort } from './ports/clickup-api.port';
import { ClickUpTaskResponseDto, ClickUpSpaceResponseDto, ClickUpListResponseDto } from './dto/clickup-task.response.dto';

describe('ClickUpService', () => {
  let service: ClickUpService;
  let clickUpApi: jest.Mocked<ClickUpApiPort>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickUpService,
        {
          provide: ClickUpApiPort,
          useValue: {
            getTasks: jest.fn(),
            createTask: jest.fn(),
            updateTask: jest.fn(),
            getSpaces: jest.fn(),
            getLists: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ClickUpService>(ClickUpService);
    clickUpApi = module.get(ClickUpApiPort);
  });

  describe('getTasks', () => {
    it('ClickUpApiPort.getTasks를 호출하고 결과를 반환한다', async () => {
      const mockTasks = [
        ClickUpTaskResponseDto.from({
          id: 'task-1',
          name: '태스크 1',
          status: 'Open',
          url: 'https://app.clickup.com/t/task-1',
        }),
      ];
      clickUpApi.getTasks.mockResolvedValue(mockTasks);

      const result = await service.getTasks('list-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('태스크 1');
      expect(clickUpApi.getTasks).toHaveBeenCalledWith('list-1');
    });
  });

  describe('createTask', () => {
    it('ClickUpApiPort.createTask를 호출하고 생성된 태스크를 반환한다', async () => {
      const mockTask = ClickUpTaskResponseDto.from({
        id: 'new-task',
        name: '새 태스크',
        status: 'Open',
        url: 'https://app.clickup.com/t/new-task',
      });
      clickUpApi.createTask.mockResolvedValue(mockTask);

      const result = await service.createTask({
        name: '새 태스크',
        listId: 'list-1',
      });

      expect(result.id).toBe('new-task');
      expect(result.name).toBe('새 태스크');
    });
  });

  describe('updateTask', () => {
    it('ClickUpApiPort.updateTask를 호출하고 수정된 태스크를 반환한다', async () => {
      const mockTask = ClickUpTaskResponseDto.from({
        id: 'task-1',
        name: '수정된 태스크',
        status: 'In Progress',
        url: 'https://app.clickup.com/t/task-1',
      });
      clickUpApi.updateTask.mockResolvedValue(mockTask);

      const result = await service.updateTask('task-1', { name: '수정된 태스크' });

      expect(result.name).toBe('수정된 태스크');
      expect(result.status).toBe('In Progress');
    });
  });

  describe('getSpaces', () => {
    it('ClickUpApiPort.getSpaces를 호출하고 결과를 반환한다', async () => {
      clickUpApi.getSpaces.mockResolvedValue([
        ClickUpSpaceResponseDto.from('space-1', 'Dev Space'),
      ]);

      const result = await service.getSpaces();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dev Space');
    });
  });

  describe('getLists', () => {
    it('ClickUpApiPort.getLists를 호출하고 결과를 반환한다', async () => {
      clickUpApi.getLists.mockResolvedValue([
        ClickUpListResponseDto.from('list-1', 'Sprint 1'),
      ]);

      const result = await service.getLists('space-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sprint 1');
    });
  });
});
