import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProjectAgentService } from './project-agent.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectAgentService: ProjectAgentService) {}

  @Get()
  findAll(): void {}

  @Get(':id')
  findOne(@Param('id') id: string): void {}
}
