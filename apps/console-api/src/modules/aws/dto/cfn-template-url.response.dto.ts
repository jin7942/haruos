import { ApiProperty } from '@nestjs/swagger';

/**
 * CloudFormation 스택 생성 URL 응답 DTO.
 */
export class CfnTemplateUrlResponseDto {
  @ApiProperty({ description: 'CloudFormation Launch Stack URL' })
  templateUrl: string;

  @ApiProperty({ description: 'HaruOS가 생성한 External ID' })
  externalId: string;

  /**
   * URL과 External ID로 응답 DTO 생성.
   *
   * @param templateUrl - CloudFormation 콘솔 URL
   * @param externalId - External ID
   */
  static of(templateUrl: string, externalId: string): CfnTemplateUrlResponseDto {
    const dto = new CfnTemplateUrlResponseDto();
    dto.templateUrl = templateUrl;
    dto.externalId = externalId;
    return dto;
  }
}
