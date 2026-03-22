import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { ContextManagerService } from './context/context-manager.service';
import { ChatRequestDto } from './orchestrator/dto/chat.request.dto';
import { ChatResponseDto } from './orchestrator/dto/chat.response.dto';
import { ConversationResponseDto } from './context/dto/conversation.response.dto';
import { MessageResponseDto } from './context/dto/message.response.dto';

/**
 * Haru AI 비서 컨트롤러.
 * 대화, 대화 목록 조회, 메시지 조회 엔드포인트를 제공한다.
 */
@ApiTags('Haru')
@ApiBearerAuth()
@Controller('haru')
export class HaruController {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly contextManager: ContextManagerService,
  ) {}

  /**
   * 대화 메시지를 전송하고 AI 응답을 받는다.
   *
   * @param dto - 대화 요청 (메시지, 대화 ID)
   * @param req - HTTP 요청 (JWT에서 userId 추출)
   * @returns AI 응답
   */
  @Post('chat')
  @ApiOperation({ summary: '대화 메시지 전송' })
  @ApiResponse({ status: 201, type: ChatResponseDto })
  chat(@Body() dto: ChatRequestDto, @Req() req: Request): Promise<ChatResponseDto> {
    const userId = (req as any).user.sub;
    return this.orchestrator.processMessage(userId, dto);
  }

  /**
   * 사용자의 대화 목록을 조회한다.
   *
   * @param req - HTTP 요청 (JWT에서 userId 추출)
   * @returns 대화 목록
   */
  @Get('conversations')
  @ApiOperation({ summary: '대화 목록 조회' })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  async getConversations(@Req() req: Request): Promise<ConversationResponseDto[]> {
    const userId = (req as any).user.sub;
    const conversations = await this.contextManager.getConversations(userId);
    return conversations.map(ConversationResponseDto.from);
  }

  /**
   * 특정 대화의 메시지 목록을 조회한다.
   *
   * @param id - 대화 ID
   * @param req - HTTP 요청 (JWT에서 userId 추출)
   * @returns 메시지 목록
   */
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: '대화 메시지 조회' })
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  async getMessages(@Param('id') id: string, @Req() req: Request): Promise<MessageResponseDto[]> {
    const userId = (req as any).user.sub;
    const messages = await this.contextManager.getMessages(id, userId);
    return messages.map(MessageResponseDto.from);
  }
}
