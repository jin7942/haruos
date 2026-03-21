import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTenantRequestDto {
  @ApiProperty({ description: '테넌트 이름', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: '테넌트 설명', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
