import { ApiProperty } from '@nestjs/swagger';

/**
 * CloudFormation Quick Create Launch URL 응답 DTO.
 * AWS Console에서 1클릭으로 스택을 생성할 수 있는 URL을 포함한다.
 */
export class CfnLaunchUrlResponseDto {
  @ApiProperty({ description: 'CloudFormation Quick Create URL (AWS Console에서 바로 실행)' })
  launchUrl: string;

  @ApiProperty({ description: 'HaruOS가 생성한 External ID' })
  externalId: string;

  @ApiProperty({ description: 'CloudFormation 스택 이름' })
  stackName: string;

  /**
   * Quick Create Launch URL 응답 생성.
   *
   * @param launchUrl - CloudFormation Quick Create URL
   * @param externalId - External ID
   * @param stackName - 스택 이름
   */
  static of(launchUrl: string, externalId: string, stackName: string): CfnLaunchUrlResponseDto {
    const dto = new CfnLaunchUrlResponseDto();
    dto.launchUrl = launchUrl;
    dto.externalId = externalId;
    dto.stackName = stackName;
    return dto;
  }
}
