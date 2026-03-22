import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { CreateScheduleRequestDto } from './dto/create-schedule.request.dto';
import { UpdateScheduleRequestDto } from './dto/update-schedule.request.dto';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';
import { ClickUpService } from '../../core/clickup/clickup.service';

/**
 * 일정 에이전트 서비스.
 * 일정 CRUD 및 ClickUp 태스크 연동을 담당한다.
 */
@Injectable()
export class ScheduleAgentService {
  private readonly logger = new Logger(ScheduleAgentService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    private readonly clickUpService: ClickUpService,
  ) {}

  /**
   * 일정을 생성한다.
   *
   * @param userId - 사용자 ID
   * @param dto - 일정 생성 정보
   * @returns 생성된 일정
   */
  async createSchedule(userId: string, dto: CreateScheduleRequestDto): Promise<Schedule> {
    const schedule = this.scheduleRepository.create({
      userId,
      title: dto.title,
      description: dto.description ?? null,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      clickupTaskId: dto.clickupTaskId ?? null,
      status: ScheduleStatus.PENDING,
    });

    const saved = await this.scheduleRepository.save(schedule);
    this.logger.log(`일정 생성: id=${saved.id}, title=${saved.title}`);
    return saved;
  }

  /**
   * 일정을 수정한다. 상태 변경은 엔티티 비즈니스 메서드를 통해 수행.
   *
   * @param id - 일정 ID
   * @param dto - 수정할 필드
   * @returns 수정된 일정
   * @throws ResourceNotFoundException 일정이 존재하지 않는 경우
   */
  async updateSchedule(id: string, dto: UpdateScheduleRequestDto): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) {
      throw new ResourceNotFoundException('Schedule', id);
    }

    if (dto.title !== undefined) schedule.title = dto.title;
    if (dto.description !== undefined) schedule.description = dto.description;
    if (dto.startDate !== undefined) schedule.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) schedule.endDate = new Date(dto.endDate);

    if (dto.status === ScheduleStatus.CONFIRMED) {
      schedule.confirm();
    } else if (dto.status === ScheduleStatus.CANCELLED) {
      schedule.cancel();
    }

    return this.scheduleRepository.save(schedule);
  }

  /**
   * 사용자의 일정 목록을 조회한다.
   *
   * @param userId - 사용자 ID
   * @param from - 조회 시작일 (선택)
   * @param to - 조회 종료일 (선택)
   * @returns 일정 목록
   */
  async getSchedules(userId: string, from?: Date, to?: Date): Promise<Schedule[]> {
    const where: Record<string, unknown> = { userId };

    if (from && to) {
      where.startDate = Between(from, to);
    } else if (from) {
      where.startDate = MoreThanOrEqual(from);
    } else if (to) {
      where.startDate = LessThanOrEqual(to);
    }

    return this.scheduleRepository.find({
      where,
      order: { startDate: 'ASC' },
    });
  }

  /**
   * 일정을 취소한다.
   *
   * @param id - 일정 ID
   * @throws ResourceNotFoundException 일정이 존재하지 않는 경우
   */
  async cancelSchedule(id: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) {
      throw new ResourceNotFoundException('Schedule', id);
    }

    schedule.cancel();
    await this.scheduleRepository.save(schedule);
    this.logger.log(`일정 취소: id=${id}`);
  }

  /**
   * 일정을 ClickUp 태스크와 동기화한다.
   * 현재는 stub 구현.
   *
   * @param scheduleId - 일정 ID
   * @throws ResourceNotFoundException 일정이 존재하지 않는 경우
   */
  async syncWithClickUp(scheduleId: string): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({ where: { id: scheduleId } });
    if (!schedule) {
      throw new ResourceNotFoundException('Schedule', scheduleId);
    }

    // TODO(2026-03-22): ClickUp 태스크와 실제 동기화 구현
    // schedule에 clickupTaskId가 있으면 updateTask, 없으면 createTask 호출
    this.logger.log(`ClickUp 동기화 stub: scheduleId=${scheduleId}`);
  }
}
