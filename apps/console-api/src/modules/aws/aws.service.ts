import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AwsCredentialEntity } from './entities/aws-credential.entity';
import { AwsCredentialPort } from './ports/aws-credential.port';
import { ValidateAwsRequestDto } from './dto/validate-aws.request.dto';
import { AwsCredentialResponseDto } from './dto/aws-credential.response.dto';
import { CfnTemplateUrlResponseDto } from './dto/cfn-template-url.response.dto';
import { ResourceNotFoundException, ValidationException } from '../../common/exceptions/business.exception';
import { ExternalApiException } from '../../common/exceptions/technical.exception';

@Injectable()
export class AwsService {
  constructor(
    @InjectRepository(AwsCredentialEntity)
    private readonly credentialRepository: Repository<AwsCredentialEntity>,
    private readonly configService: ConfigService,
    private readonly awsCredentialPort: AwsCredentialPort,
  ) {}

  /**
   * CloudFormation 스택 생성 URL을 반환한다.
   * External ID를 생성하여 URL 파라미터에 포함.
   *
   * @param tenantId - 테넌트 ID
   * @returns CloudFormation Launch Stack URL과 External ID
   */
  getCfnTemplateUrl(tenantId: string): CfnTemplateUrlResponseDto {
    const externalId = `haruos-${tenantId}-${randomUUID().slice(0, 8)}`;
    const templateS3Url = this.configService.get<string>(
      'AWS_CFN_TEMPLATE_URL',
      'https://haruos-cfn-templates.s3.amazonaws.com/haruos-role.yaml',
    );

    const region = this.configService.get<string>('AWS_DEFAULT_REGION', 'ap-northeast-2');
    const templateUrl =
      `https://${region}.console.aws.amazon.com/cloudformation/home` +
      `?region=${region}#/stacks/quickcreate` +
      `?templateURL=${encodeURIComponent(templateS3Url)}` +
      `&param_ExternalId=${encodeURIComponent(externalId)}`;

    return CfnTemplateUrlResponseDto.of(templateUrl, externalId);
  }

  /**
   * AWS 자격증명 검증. Role ARN + External ID로 STS AssumeRole을 시도하고,
   * Bedrock 접근 가능 여부까지 확인한 뒤 자격증명을 저장한다.
   *
   * @param tenantId - 테넌트 ID
   * @param dto - roleArn, externalId, region
   * @returns 검증된 자격증명 정보
   * @throws ValidationException Role 검증 실패 시
   * @throws ValidationException Bedrock 접근 불가 시
   * @throws ExternalApiException AWS API 호출 실패 시
   */
  async validateCredential(
    tenantId: string,
    dto: ValidateAwsRequestDto,
  ): Promise<AwsCredentialResponseDto> {
    const roleValid = await this.awsCredentialPort.validateRole(
      dto.roleArn,
      dto.externalId,
      dto.region,
    );
    if (!roleValid) {
      throw new ValidationException(
        'IAM Role 검증 실패. Role ARN과 External ID를 확인하세요.',
      );
    }

    const bedrockAccessible = await this.awsCredentialPort.checkBedrockAccess(
      dto.roleArn,
      dto.externalId,
      dto.region,
    );
    if (!bedrockAccessible) {
      throw new ValidationException(
        `Bedrock 접근 불가. ${dto.region} 리전에서 Bedrock Claude 모델 접근 권한을 확인하세요.`,
      );
    }

    const credential = AwsCredentialEntity.create(
      tenantId,
      dto.roleArn,
      dto.externalId,
      dto.region,
    );
    credential.validate();

    await this.credentialRepository.save(credential);
    return AwsCredentialResponseDto.from(credential);
  }

  /**
   * 테넌트의 AWS 자격증명을 조회한다.
   *
   * @param tenantId - 테넌트 ID
   * @returns AWS 자격증명 정보
   * @throws ResourceNotFoundException 자격증명이 없는 경우
   */
  async findByTenantId(tenantId: string): Promise<AwsCredentialResponseDto> {
    const credential = await this.credentialRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    if (!credential) {
      throw new ResourceNotFoundException('AwsCredential', tenantId);
    }
    return AwsCredentialResponseDto.from(credential);
  }

  /**
   * STS AssumeRole로 임시 자격증명을 발급한다. 프로비저닝/모니터링 모듈에서 사용.
   *
   * @param tenantId - 테넌트 ID
   * @returns 임시 자격증명 (accessKeyId, secretAccessKey, sessionToken)
   * @throws ResourceNotFoundException 자격증명이 없는 경우
   * @throws ExternalApiException STS API 호출 실패 시
   */
  async assumeRole(
    tenantId: string,
  ): Promise<{ accessKeyId: string; secretAccessKey: string; sessionToken: string }> {
    const credential = await this.credentialRepository.findOne({
      where: { tenantId, status: 'VALIDATED' },
      order: { createdAt: 'DESC' },
    });
    if (!credential) {
      throw new ResourceNotFoundException('AwsCredential', tenantId);
    }

    return this.awsCredentialPort.assumeRole(credential.roleArn, credential.externalId);
  }
}
