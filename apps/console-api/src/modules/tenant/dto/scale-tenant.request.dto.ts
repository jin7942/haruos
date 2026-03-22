import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 테넌트 사양 변경 (플랜 타입 변경) 요청 DTO. */
export class ScaleTenantRequestDto {
  @ApiProperty({ description: '변경할 플랜 타입', example: 'PRO' })
  @IsString()
  planType: string;
}
