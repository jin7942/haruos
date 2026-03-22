import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Stripe Checkout 세션 생성 요청 DTO. */
export class CreateCheckoutRequestDto {
  @ApiProperty({ description: '테넌트 ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '요금제 가격 ID (월간 또는 연간)' })
  @IsString()
  priceId: string;

  @ApiProperty({ description: '결제 성공 후 리다이렉트 URL' })
  @IsUrl({}, { message: 'successUrl must be a valid URL' })
  successUrl: string;

  @ApiProperty({ description: '결제 취소 후 리다이렉트 URL' })
  @IsUrl({}, { message: 'cancelUrl must be a valid URL' })
  cancelUrl: string;
}
