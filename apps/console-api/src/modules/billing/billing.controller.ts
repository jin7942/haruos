import { Controller, Post, Get, Delete, Body, Param, Req, Headers, Query, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { CreateSubscriptionRequestDto } from './dto/create-subscription.request.dto';
import { CreateCheckoutRequestDto } from './dto/create-checkout.request.dto';
import { CreatePortalRequestDto } from './dto/create-portal.request.dto';
import { SubscriptionResponseDto } from './dto/subscription.response.dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 구독 결제 컨트롤러.
 * 구독 CRUD, Stripe Checkout/Portal, 웹훅 처리 API를 제공한다.
 * 모든 테넌트 데이터 접근 시 JWT userId로 소유권을 검증한다.
 */
@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * 구독을 생성한다.
   *
   * @param req - HTTP 요청 (JWT userId 추출)
   * @param dto - 구독 생성 요청
   * @returns 생성된 구독 정보
   */
  @Post('subscriptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: '구독 생성' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  @ApiResponse({ status: 409, description: '이미 활성 구독이 존재' })
  async createSubscription(@Req() req: Request, @Body() dto: CreateSubscriptionRequestDto): Promise<SubscriptionResponseDto> {
    await this.billingService.verifyTenantOwnership((req as any).user.sub, dto.tenantId);
    return this.billingService.createSubscription(dto);
  }

  /**
   * 테넌트의 구독 정보를 조회한다.
   *
   * @param req - HTTP 요청 (JWT userId 추출)
   * @param tenantId - 테넌트 ID
   * @returns 구독 정보
   */
  @Get('subscriptions/:tenantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '구독 조회' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: '구독 없음' })
  async getSubscription(@Req() req: Request, @Param('tenantId') tenantId: string): Promise<SubscriptionResponseDto> {
    await this.billingService.verifyTenantOwnership((req as any).user.sub, tenantId);
    return this.billingService.getSubscription(tenantId);
  }

  /**
   * 테넌트의 구독을 취소한다.
   *
   * @param req - HTTP 요청 (JWT userId 추출)
   * @param tenantId - 테넌트 ID
   * @returns 취소된 구독 정보
   */
  @Delete('subscriptions/:tenantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '구독 취소' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: '활성 구독 없음' })
  async cancelSubscription(@Req() req: Request, @Param('tenantId') tenantId: string): Promise<SubscriptionResponseDto> {
    await this.billingService.verifyTenantOwnership((req as any).user.sub, tenantId);
    return this.billingService.cancelSubscription(tenantId);
  }

  /**
   * Stripe Checkout 세션을 생성한다.
   * 프론트엔드에서 반환된 URL로 리다이렉트하여 결제 진행.
   *
   * @param req - HTTP 요청 (JWT userId 추출)
   * @param dto - 체크아웃 요청
   * @returns checkoutUrl
   */
  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stripe Checkout 세션 생성' })
  @ApiResponse({ status: 201, description: 'Checkout URL 반환' })
  async createCheckoutSession(@Req() req: Request, @Body() dto: CreateCheckoutRequestDto): Promise<{ checkoutUrl: string }> {
    await this.billingService.verifyTenantOwnership((req as any).user.sub, dto.tenantId);
    return this.billingService.createCheckoutSession(dto);
  }

  /**
   * Stripe Customer Portal 세션을 생성한다.
   * 결제수단 변경, 인보이스 확인 등을 위한 포털.
   *
   * @param req - HTTP 요청 (JWT userId 추출)
   * @param dto - 포털 요청
   * @returns portalUrl
   */
  @Post('portal')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Stripe Customer Portal 세션 생성' })
  @ApiResponse({ status: 201, description: 'Portal URL 반환' })
  async createPortalSession(@Req() req: Request, @Body() dto: CreatePortalRequestDto): Promise<{ portalUrl: string }> {
    await this.billingService.verifyTenantOwnership((req as any).user.sub, dto.tenantId);
    return this.billingService.createPortalSession(dto);
  }

  /**
   * 테넌트의 인보이스 목록을 조회한다.
   *
   * @param req - HTTP 요청 (JWT userId 추출)
   * @param tenantId - 테넌트 ID
   * @param limit - 조회 개수
   * @returns 인보이스 목록
   */
  @Get('invoices/:tenantId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '인보이스 목록 조회' })
  async getInvoices(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    await this.billingService.verifyTenantOwnership((req as any).user.sub, tenantId);
    return this.billingService.listInvoices(tenantId, limit ? parseInt(limit, 10) : 10);
  }

  /**
   * Stripe 웹훅 이벤트를 수신한다.
   * 인증 없이 접근 가능 (Stripe 서명 검증으로 보호).
   * raw body 필요 (서명 검증용).
   *
   * @param req - Raw body 요청
   * @param signature - Stripe-Signature 헤더
   */
  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Stripe 웹훅 수신' })
  @ApiResponse({ status: 200, description: '이벤트 처리 완료' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for webhook signature verification');
    }
    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
