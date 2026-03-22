import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { ScheduleAgentService } from './schedule-agent.service';
import { CreateScheduleRequestDto } from './dto/create-schedule.request.dto';
import { UpdateScheduleRequestDto } from './dto/update-schedule.request.dto';
import { ScheduleResponseDto } from './dto/schedule.response.dto';

/**
 * 일정 에이전트 컨트롤러.
 * 일정 CRUD 및 ClickUp 동기화 API를 제공한다.
 */
@ApiTags('Schedule Agent')
@ApiBearerAuth()
@Controller('agents/schedules')
export class ScheduleController {
  constructor(private readonly scheduleAgentService: ScheduleAgentService) {}

  /**
   * 일정을 생성한다.
   *
   * @param req - HTTP 요청 (JWT 사용자 정보 포함)
   * @param dto - 일정 생성 정보
   * @returns 생성된 일정
   */
  @Post()
  @ApiOperation({ summary: '일정 생성' })
  @ApiResponse({ status: 201, type: ScheduleResponseDto })
  async createSchedule(
    @Req() req: Request,
    @Body() dto: CreateScheduleRequestDto,
  ): Promise<ScheduleResponseDto> {
    const userId = (req as any).user.sub;
    const schedule = await this.scheduleAgentService.createSchedule(userId, dto);
    return ScheduleResponseDto.from(schedule);
  }

  /**
   * 일정 목록을 조회한다.
   *
   * @param req - HTTP 요청
   * @param from - 조회 시작일
   * @param to - 조회 종료일
   * @returns 일정 목록
   */
  @Get()
  @ApiOperation({ summary: '일정 목록 조회' })
  @ApiQuery({ name: 'from', required: false, description: '조회 시작일 (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: '조회 종료일 (ISO 8601)' })
  @ApiResponse({ status: 200, type: [ScheduleResponseDto] })
  async getSchedules(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ScheduleResponseDto[]> {
    const userId = (req as any).user.sub;
    const schedules = await this.scheduleAgentService.getSchedules(
      userId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return schedules.map(ScheduleResponseDto.from);
  }

  /**
   * 일정을 수정한다.
   *
   * @param id - 일정 ID
   * @param dto - 수정할 필드
   * @returns 수정된 일정
   */
  @Patch(':id')
  @ApiOperation({ summary: '일정 수정' })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleRequestDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.scheduleAgentService.updateSchedule(id, dto);
    return ScheduleResponseDto.from(schedule);
  }

  /**
   * 일정을 취소한다.
   *
   * @param id - 일정 ID
   */
  @Delete(':id')
  @ApiOperation({ summary: '일정 취소' })
  @ApiResponse({ status: 200 })
  cancelSchedule(@Param('id') id: string): Promise<void> {
    return this.scheduleAgentService.cancelSchedule(id);
  }

  /**
   * 일정을 ClickUp 태스크와 동기화한다.
   *
   * @param id - 일정 ID
   */
  @Post(':id/sync')
  @ApiOperation({ summary: '일정-ClickUp 동기화' })
  @ApiResponse({ status: 201 })
  syncWithClickUp(@Param('id') id: string): Promise<void> {
    return this.scheduleAgentService.syncWithClickUp(id);
  }
}
