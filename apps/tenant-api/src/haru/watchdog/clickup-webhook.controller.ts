import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ClickUpWebhookDto } from './dto/clickup-webhook.dto';

/**
 * ClickUp 웹훅 수신 컨트롤러.
 * ClickUp에서 발생하는 이벤트(태스크 생성/수정/삭제 등)를 수신한다.
 * 인증 불필요 (@Public).
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class ClickUpWebhookController {
  private readonly logger = new Logger(ClickUpWebhookController.name);

  /**
   * ClickUp 웹훅 이벤트를 수신한다.
   *
   * @param payload - ClickUp 웹훅 페이로드
   */
  @Public()
  @Post('clickup')
  @ApiOperation({ summary: 'ClickUp 웹훅 수신' })
  @ApiResponse({ status: 201, description: '웹훅 수신 성공' })
  async handleWebhook(@Body() payload: ClickUpWebhookDto): Promise<void> {
    this.logger.log(`ClickUp webhook received: event=${payload.event}, task=${payload.task_id ?? 'N/A'}`);
    // 향후 구현: 이벤트 타입별 처리 (태스크 동기화, 알림 등)
  }
}
