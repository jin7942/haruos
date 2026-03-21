import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCodeGroupRequestDto {
  @ApiProperty({ description: '코드 그룹 코드 (PK)', example: 'TENANT_STATUS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  groupCode: string;

  @ApiProperty({ description: '그룹명', example: '테넌트 상태' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '설명', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
