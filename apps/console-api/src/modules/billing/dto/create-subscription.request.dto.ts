import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 구독 생성 요청 DTO. */
export class CreateSubscriptionRequestDto {
  @ApiProperty({ description: '테넌트 ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '요금제 타입', example: 'STANDARD' })
  @IsString()
  planType: string;

  @ApiProperty({ description: '결제 고객 이메일' })
  @IsString()
  email: string;

  @ApiProperty({ description: '결제 고객 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Stripe 가격 ID', required: false })
  @IsOptional()
  @IsString()
  priceId?: string;
}
