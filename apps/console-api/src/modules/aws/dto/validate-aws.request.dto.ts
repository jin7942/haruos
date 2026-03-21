import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * AWS 자격증명 검증 요청 DTO.
 */
export class ValidateAwsRequestDto {
  @ApiProperty({
    description: 'IAM Role ARN',
    example: 'arn:aws:iam::123456789012:role/HaruOSRole',
  })
  @IsString()
  @Matches(/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/, {
    message: 'roleArn must be a valid IAM Role ARN format',
  })
  roleArn: string;

  @ApiProperty({
    description: 'External ID (크로스 어카운트 보안용)',
    example: 'haruos-ext-abc123',
  })
  @IsString()
  externalId: string;

  @ApiProperty({
    description: 'AWS 리전',
    example: 'ap-northeast-2',
  })
  @IsString()
  region: string;
}
