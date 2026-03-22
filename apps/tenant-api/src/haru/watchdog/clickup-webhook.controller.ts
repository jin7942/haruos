import { Controller, Post, Body, Headers, RawBodyRequest, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { UnauthorizedException } from '../../common/exceptions/business.exception';
import { ClickUpWebhookDto } from './dto/clickup-webhook.dto';

/**
 * ClickUp 웹훅 수신 컨트롤러.
 * ClickUp에서 발생하는 이벤트(태스크 생성/수정/삭제 등)를 수신한다.
 * X-Signature 헤더로 HMAC-SHA256 서명을 검증한다.
 */
@ApiTags('Webhooks')
@Controller('webhooks')
export class ClickUpWebhookController {
  private readonly logger = new Logger(ClickUpWebhookController.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * ClickUp 웹훅 이벤트를 수신한다.
   * X-Signature 헤더의 HMAC-SHA256 서명을 검증한 후 처리한다.
   *
   * @param payload - ClickUp 웹훅 페이로드
   * @param signature - X-Signature 헤더 값
   * @param req - rawBody 접근을 위한 HTTP 요청
   * @throws UnauthorizedException 서명 검증 실패 시
   */
  @Public()
  @Post('clickup')
  @ApiOperation({ summary: 'ClickUp 웹훅 수신' })
  @ApiResponse({ status: 201, description: '웹훅 수신 성공' })
  @ApiResponse({ status: 401, description: '서명 검증 실패' })
  async handleWebhook(
    @Body() payload: ClickUpWebhookDto,
    @Headers('x-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<void> {
    this.verifySignature(signature, req.rawBody);

    this.logger.log(`ClickUp webhook received: event=${payload.event}, task=${payload.task_id ?? 'N/A'}`);
    // 향후 구현: 이벤트 타입별 처리 (태스크 동기화, 알림 등)
  }

  /**
   * ClickUp 웹훅 서명을 HMAC-SHA256으로 검증한다.
   *
   * @param signature - X-Signature 헤더 값
   * @param rawBody - 요청 원본 바디
   * @throws UnauthorizedException 서명이 없거나 불일치하는 경우
   */
  private verifySignature(signature: string | undefined, rawBody: Buffer | undefined): void {
    const secret = this.configService.get<string>('CLICKUP_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('CLICKUP_WEBHOOK_SECRET not configured, skipping signature verification');
      return;
    }

    if (!signature || !rawBody) {
      throw new UnauthorizedException('Missing webhook signature');
    }

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
