import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 커스텀 도메인 추가 요청 DTO.
 */
export class CreateDomainRequestDto {
  @ApiProperty({ description: '커스텀 도메인', example: 'haru.company.com' })
  @IsString()
  domain: string;

  @ApiProperty({
    description: 'DNS 제공자',
    enum: ['CLOUDFLARE', 'ROUTE53', 'MANUAL'],
  })
  @IsString()
  @IsIn(['CLOUDFLARE', 'ROUTE53', 'MANUAL'])
  dnsProvider: string;

  @ApiPropertyOptional({ description: 'Cloudflare Zone ID' })
  @IsOptional()
  @IsString()
  cloudflareZoneId?: string;

  @ApiPropertyOptional({ description: 'Cloudflare API Token' })
  @IsOptional()
  @IsString()
  cloudflareApiToken?: string;
}
