import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleAgentService } from './schedule-agent.service';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { ClickUpService } from '../../core/clickup/clickup.service';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';
import { InvalidStateTransitionException } from '../../common/exceptions/business.exception';

describe('ScheduleAgentService', () => {
  let service: ScheduleAgentService;
  let scheduleRepo: jest.Mocked<Repository<Schedule>>;

  const mockSchedule: Partial<Schedule> = {
    id: 's-1',
    userId: 'user-1',
    title: '팀 미팅',
    description: null,
    startDate: new Date('2026-03-25T10:00:00Z'),
    endDate: new Date('2026-03-25T11:00:00Z'),
    clickupTaskId: null,
    status: ScheduleStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleAgentService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ClickUpService,
          useValue: {
            createTask: jest.fn(),
            updateTask: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ScheduleAgentService);
    scheduleRepo = module.get(getRepositoryToken(Schedule));
  });

  describe('createSchedule', () => {
    it('일정을 생성한다', async () => {
      scheduleRepo.create.mockReturnValue(mockSchedule as Schedule);
      scheduleRepo.save.mockResolvedValue(mockSchedule as Schedule);

      const result = await service.createSchedule('user-1', {
        title: '팀 미팅',
        startDate: '2026-03-25T10:00:00Z',
        endDate: '2026-03-25T11:00:00Z',
      });

      expect(result.title).toBe('팀 미팅');
      expect(scheduleRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateSchedule', () => {
    it('일정 제목을 수정한다', async () => {
      const schedule = Object.assign(new Schedule(), mockSchedule);
      scheduleRepo.findOne.mockResolvedValue(schedule);
      scheduleRepo.save.mockImplementation((s) => Promise.resolve(s as Schedule));

      const result = await service.updateSchedule('s-1', { title: '변경된 미팅' });

      expect(result.title).toBe('변경된 미팅');
    });

    it('PENDING 상태를 CONFIRMED로 변경한다', async () => {
      const schedule = Object.assign(new Schedule(), mockSchedule);
      scheduleRepo.findOne.mockResolvedValue(schedule);
      scheduleRepo.save.mockImplementation((s) => Promise.resolve(s as Schedule));

      const result = await service.updateSchedule('s-1', { status: 'CONFIRMED' });

      expect(result.status).toBe('CONFIRMED');
    });

    it('존재하지 않는 일정 수정 시 ResourceNotFoundException을 던진다', async () => {
      scheduleRepo.findOne.mockResolvedValue(null);

      await expect(service.updateSchedule('not-found', { title: 'X' })).rejects.toThrow(
        ResourceNotFoundException,
      );
    });
  });

  describe('cancelSchedule', () => {
    it('PENDING 일정을 취소한다', async () => {
      const schedule = Object.assign(new Schedule(), mockSchedule);
      scheduleRepo.findOne.mockResolvedValue(schedule);
      scheduleRepo.save.mockImplementation((s) => Promise.resolve(s as Schedule));

      await service.cancelSchedule('s-1');

      expect(schedule.status).toBe(ScheduleStatus.CANCELLED);
      expect(scheduleRepo.save).toHaveBeenCalled();
    });

    it('이미 취소된 일정을 다시 취소하면 InvalidStateTransitionException을 던진다', async () => {
      const schedule = Object.assign(new Schedule(), {
        ...mockSchedule,
        status: ScheduleStatus.CANCELLED,
      });
      scheduleRepo.findOne.mockResolvedValue(schedule);

      await expect(service.cancelSchedule('s-1')).rejects.toThrow(InvalidStateTransitionException);
    });
  });

  describe('getSchedules', () => {
    it('사용자의 일정 목록을 반환한다', async () => {
      scheduleRepo.find.mockResolvedValue([mockSchedule as Schedule]);

      const result = await service.getSchedules('user-1');

      expect(result).toHaveLength(1);
      expect(scheduleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
        }),
      );
    });
  });
});
