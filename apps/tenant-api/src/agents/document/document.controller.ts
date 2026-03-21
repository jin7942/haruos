import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DocumentAgentService } from './document-agent.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentAgentService: DocumentAgentService) {}

  @Get()
  findAll(): void {}

  @Get(':id')
  findOne(@Param('id') id: string): void {}
}
