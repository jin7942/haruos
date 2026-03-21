import { Controller, Get, Patch, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ScheduleAgentService } from './schedule-agent.service';

@ApiTags('schedules')
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleAgentService: ScheduleAgentService) {}

  @Get()
  findAll(): void {}

  @Patch(':id')
  update(@Param('id') id: string): void {}
}
