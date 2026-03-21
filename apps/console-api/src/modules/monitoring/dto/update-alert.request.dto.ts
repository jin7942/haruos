import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 알림 설정 수정 요청 DTO.
 */
export class UpdateAlertRequestDto {
  @ApiProperty({ description: '임계값', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  threshold?: number;

  @ApiProperty({ description: '활성화 여부', required: false })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
