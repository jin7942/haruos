import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('haru')
@Controller('haru')
export class HaruController {
  @Post('chat')
  chat(): void {}

  @Get('conversations')
  getConversations(): void {}
}
