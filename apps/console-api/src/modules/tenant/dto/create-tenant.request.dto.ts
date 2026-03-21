import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantRequestDto {
  @ApiProperty({ description: '테넌트 이름' })
  @IsString()
  name: string;

  @ApiProperty({ description: '테넌트 슬러그 (URL용)' })
  @IsString()
  slug: string;

  @ApiProperty({ description: '테넌트 설명' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'AWS 리전' })
  @IsString()
  region: string;
}
