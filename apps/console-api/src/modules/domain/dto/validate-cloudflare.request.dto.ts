import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Cloudflare API 토큰 + Zone 검증 요청 DTO.
 */
export class ValidateCloudflareRequestDto {
  @ApiProperty({ description: 'Cloudflare API Token', example: 'cf-token-xxx' })
  @IsString()
  apiToken: string;

  @ApiProperty({ description: 'Cloudflare Zone ID', example: 'zone-id-xxx' })
  @IsString()
  zoneId: string;
}
