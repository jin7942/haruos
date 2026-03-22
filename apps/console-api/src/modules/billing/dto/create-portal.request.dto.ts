import { IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Stripe Customer Portal 세션 생성 요청 DTO. */
export class CreatePortalRequestDto {
  @ApiProperty({ description: '테넌트 ID' })
  @IsString()
  tenantId: string;

  @ApiProperty({ description: '포털에서 돌아올 URL' })
  @IsUrl({}, { message: 'returnUrl must be a valid URL' })
  returnUrl: string;
}
