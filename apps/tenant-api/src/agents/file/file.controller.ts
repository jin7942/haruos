import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileAgentService } from './file-agent.service';

@ApiTags('files')
@Controller('files')
export class FileController {
  constructor(private readonly fileAgentService: FileAgentService) {}

  @Post('upload')
  upload(): void {}

  @Get()
  findAll(): void {}
}
