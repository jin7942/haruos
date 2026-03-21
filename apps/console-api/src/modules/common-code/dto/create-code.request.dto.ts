import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCodeRequestDto {
  @ApiProperty({ description: '코드 그룹 코드', example: 'TENANT_STATUS' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  groupCode: string;

  @ApiProperty({ description: '코드값', example: 'ACTIVE' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: '코드명', example: '활성' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '정렬 순서', default: 0, required: false })
  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ description: '활성 여부', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiProperty({ description: '추가 속성 (JSON)', required: false })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
