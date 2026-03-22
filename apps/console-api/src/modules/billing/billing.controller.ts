import { Controller, Post, Get, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateSubscriptionRequestDto } from './dto/create-subscription.request.dto';
import { SubscriptionResponseDto } from './dto/subscription.response.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * 구독을 생성한다.
   *
   * @param dto - 구독 생성 요청
   * @returns 생성된 구독 정보
   */
  @Post('subscriptions')
  @ApiOperation({ summary: '구독 생성' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
  @ApiResponse({ status: 409, description: '이미 활성 구독이 존재' })
  createSubscription(@Body() dto: CreateSubscriptionRequestDto): Promise<SubscriptionResponseDto> {
    return this.billingService.createSubscription(dto);
  }

  /**
   * 테넌트의 구독 정보를 조회한다.
   *
   * @param tenantId - 테넌트 ID
   * @returns 구독 정보
   */
  @Get('subscriptions/:tenantId')
  @ApiOperation({ summary: '구독 조회' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: '구독 없음' })
  getSubscription(@Param('tenantId') tenantId: string): Promise<SubscriptionResponseDto> {
    return this.billingService.getSubscription(tenantId);
  }

  /**
   * 테넌트의 구독을 취소한다.
   *
   * @param tenantId - 테넌트 ID
   * @returns 취소된 구독 정보
   */
  @Delete('subscriptions/:tenantId')
  @ApiOperation({ summary: '구독 취소' })
  @ApiResponse({ status: 200, type: SubscriptionResponseDto })
  @ApiResponse({ status: 404, description: '활성 구독 없음' })
  cancelSubscription(@Param('tenantId') tenantId: string): Promise<SubscriptionResponseDto> {
    return this.billingService.cancelSubscription(tenantId);
  }
}
