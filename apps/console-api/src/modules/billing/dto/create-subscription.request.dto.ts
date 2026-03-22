import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 구독 생성 요청 DTO. */
export class CreateSubscriptionRequestDto {
  @ApiProperty({ description: '테넌트 ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '결제 고객 이메일' })
  @IsString()
  email: string;

  @ApiProperty({ description: '결제 고객 이름' })
  @IsString()
  name: string;
}
