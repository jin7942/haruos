import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DomainEntity } from './entities/domain.entity';
import { CreateDomainRequestDto } from './dto/create-domain.request.dto';
import { DomainResponseDto } from './dto/domain.response.dto';
import { TenantService } from '../tenant/tenant.service';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
  ValidationException,
} from '../../common/exceptions/business.exception';

/** 기본 서브도메인 베이스 */
const BASE_DOMAIN = 'haruos.app';

@Injectable()
export class DomainService {
  constructor(
    @InjectRepository(DomainEntity)
    private readonly domainRepository: Repository<DomainEntity>,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * 테넌트 생성 시 서브도메인 자동 생성.
   * slug 기반으로 {slug}.haruos.app 형태의 기본 도메인을 생성한다.
   *
   * @param tenantId - 테넌트 ID
   * @param slug - 테넌트 슬러그
   * @returns 생성된 서브도메인 정보
   * @throws DuplicateResourceException 도메인이 이미 존재하는 경우
   */
  async createSubdomain(tenantId: string, slug: string): Promise<DomainResponseDto> {
    const domainName = `${slug}.${BASE_DOMAIN}`;
    await this.assertDomainNotExists(domainName);

    const domain = DomainEntity.createSubdomain(tenantId, slug, BASE_DOMAIN);
    await this.domainRepository.save(domain);
    return DomainResponseDto.from(domain);
  }

  /**
   * 커스텀 도메인 추가. 소유권 검증 후 PENDING 상태로 생성.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @param dto - 도메인, DNS 제공자, Cloudflare 설정
   * @returns 생성된 도메인 정보
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   * @throws DuplicateResourceException 도메인이 이미 존재하는 경우
   */
  async addCustomDomain(
    userId: string,
    tenantId: string,
    dto: CreateDomainRequestDto,
  ): Promise<DomainResponseDto> {
    await this.tenantService.findOne(userId, tenantId);
    await this.assertDomainNotExists(dto.domain);

    const domain = DomainEntity.createCustom(
      tenantId,
      dto.domain,
      dto.dnsProvider,
      dto.cloudflareZoneId,
      dto.cloudflareApiToken,
    );
    await this.domainRepository.save(domain);
    return DomainResponseDto.from(domain);
  }

  /**
   * 테넌트 소유 도메인 목록 조회. 소유권 검증 포함.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @returns 도메인 목록
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async findByTenantId(userId: string, tenantId: string): Promise<DomainResponseDto[]> {
    await this.tenantService.findOne(userId, tenantId);
    const domains = await this.domainRepository.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
    return domains.map(DomainResponseDto.from);
  }

  /**
   * 도메인 삭제. 기본 서브도메인(is_primary)은 삭제 불가.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @param domainId - 도메인 ID
   * @throws ResourceNotFoundException 도메인이 없거나 소유자가 아닌 경우
   * @throws ValidationException 기본 도메인을 삭제하려는 경우
   */
  async remove(userId: string, tenantId: string, domainId: string): Promise<void> {
    const domain = await this.findOwnedDomain(userId, tenantId, domainId);

    if (domain.isPrimary) {
      throw new ValidationException('Primary domain cannot be deleted');
    }

    await this.domainRepository.remove(domain);
  }

  /**
   * 기본 도메인 변경. 기존 primary를 해제하고 대상을 primary로 설정.
   * ACTIVE 상태의 도메인만 primary로 설정 가능.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @param domainId - primary로 설정할 도메인 ID
   * @returns 변경된 도메인 정보
   * @throws ResourceNotFoundException 도메인이 없거나 소유자가 아닌 경우
   * @throws ValidationException ACTIVE 상태가 아닌 도메인을 primary로 설정하려는 경우
   */
  async setPrimary(
    userId: string,
    tenantId: string,
    domainId: string,
  ): Promise<DomainResponseDto> {
    const domain = await this.findOwnedDomain(userId, tenantId, domainId);

    if (domain.status !== 'ACTIVE') {
      throw new ValidationException('Only ACTIVE domains can be set as primary');
    }

    // 기존 primary 해제
    await this.domainRepository.update(
      { tenantId, isPrimary: true },
      { isPrimary: false },
    );

    domain.isPrimary = true;
    await this.domainRepository.save(domain);
    return DomainResponseDto.from(domain);
  }

  /**
   * DNS 검증 수행. PENDING 상태의 도메인을 VERIFIED로 전이.
   * 실제 DNS 조회는 추후 구현 (현재는 상태 전이만 수행).
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @param domainId - 도메인 ID
   * @returns 검증된 도메인 정보
   * @throws ResourceNotFoundException 도메인이 없거나 소유자가 아닌 경우
   * @throws InvalidStateTransitionException PENDING 상태가 아닌 경우
   */
  async verifyDns(
    userId: string,
    tenantId: string,
    domainId: string,
  ): Promise<DomainResponseDto> {
    const domain = await this.findOwnedDomain(userId, tenantId, domainId);

    // TODO(2026-03-21): 실제 DNS CNAME 레코드 조회 로직 추가
    domain.verify();
    await this.domainRepository.save(domain);
    return DomainResponseDto.from(domain);
  }

  /**
   * 소유권이 검증된 도메인을 조회한다.
   *
   * @param userId - 소유자 ID
   * @param tenantId - 테넌트 ID
   * @param domainId - 도메인 ID
   * @returns 도메인 엔티티
   * @throws ResourceNotFoundException 도메인이 없거나 소유자가 아닌 경우
   */
  private async findOwnedDomain(
    userId: string,
    tenantId: string,
    domainId: string,
  ): Promise<DomainEntity> {
    await this.tenantService.findOne(userId, tenantId);
    const domain = await this.domainRepository.findOne({
      where: { id: domainId, tenantId },
    });
    if (!domain) {
      throw new ResourceNotFoundException('Domain', domainId);
    }
    return domain;
  }

  /**
   * 도메인 중복 검증.
   *
   * @param domainName - 검증할 도메인명
   * @throws DuplicateResourceException 이미 존재하는 경우
   */
  private async assertDomainNotExists(domainName: string): Promise<void> {
    const existing = await this.domainRepository.findOne({
      where: { domain: domainName },
    });
    if (existing) {
      throw new DuplicateResourceException('Domain', domainName);
    }
  }
}
