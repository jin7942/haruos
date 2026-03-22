import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AwsService } from './aws.service';
import { ValidateAwsRequestDto } from './dto/validate-aws.request.dto';
import { AwsCredentialResponseDto } from './dto/aws-credential.response.dto';
import { CfnTemplateUrlResponseDto } from './dto/cfn-template-url.response.dto';
import { CfnLaunchUrlResponseDto } from './dto/cfn-launch-url.response.dto';

@ApiTags('AWS')
@ApiBearerAuth()
@Controller('tenants/:tenantId/aws')
export class AwsController {
  constructor(private readonly awsService: AwsService) {}

  @Get('cfn-template-url')
  @ApiOperation({ summary: 'CloudFormation 스택 생성 URL 조회' })
  @ApiResponse({ status: 200, type: CfnTemplateUrlResponseDto })
  getCfnTemplateUrl(@Param('tenantId') tenantId: string): CfnTemplateUrlResponseDto {
    return this.awsService.getCfnTemplateUrl(tenantId);
  }

  @Get('cfn-launch-url')
  @ApiOperation({ summary: 'CloudFormation 1클릭 Quick Create URL 생성' })
  @ApiResponse({ status: 200, type: CfnLaunchUrlResponseDto })
  @ApiQuery({ name: 'region', required: false, description: 'AWS 리전 (기본: ap-northeast-2)' })
  getCfnLaunchUrl(
    @Param('tenantId') tenantId: string,
    @Query('region') region?: string,
  ): CfnLaunchUrlResponseDto {
    return this.awsService.getCfnLaunchUrl(tenantId, region);
  }

  @Post('validate')
  @ApiOperation({ summary: 'AWS 자격증명 검증' })
  @ApiResponse({ status: 201, type: AwsCredentialResponseDto })
  validateCredential(
    @Param('tenantId') tenantId: string,
    @Body() dto: ValidateAwsRequestDto,
  ): Promise<AwsCredentialResponseDto> {
    return this.awsService.validateCredential(tenantId, dto);
  }

  @Get('credential')
  @ApiOperation({ summary: 'AWS 자격증명 조회' })
  @ApiResponse({ status: 200, type: AwsCredentialResponseDto })
  findCredential(@Param('tenantId') tenantId: string): Promise<AwsCredentialResponseDto> {
    return this.awsService.findByTenantId(tenantId);
  }
}
