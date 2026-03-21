import { Injectable } from '@nestjs/common';

/**
 * ProvisionerFacade - 프로비저닝 전체 오케스트레이션.
 * Terraform, Ansible, DNS 포트를 조합하여 테넌트 인프라를 구성한다.
 */
@Injectable()
export class ProvisionerFacade {}
