import { ApiProperty } from '@nestjs/swagger';

/**
 * Cloudflare 검증 결과 응답 DTO.
 */
export class ValidateCloudflareResponseDto {
  @ApiProperty({ description: '검증 성공 여부' })
  valid: boolean;

  @ApiProperty({ description: 'Zone 이름 (도메인)', example: 'example.com' })
  zoneName: string;

  @ApiProperty({ description: 'Zone 상태', example: 'active' })
  zoneStatus: string;

  /**
   * 검증 결과를 DTO로 변환.
   *
   * @param valid - 검증 성공 여부
   * @param zoneName - Zone 이름
   * @param zoneStatus - Zone 상태
   * @returns 검증 결과 DTO
   */
  static of(valid: boolean, zoneName: string, zoneStatus: string): ValidateCloudflareResponseDto {
    const dto = new ValidateCloudflareResponseDto();
    dto.valid = valid;
    dto.zoneName = zoneName;
    dto.zoneStatus = zoneStatus;
    return dto;
  }
}
