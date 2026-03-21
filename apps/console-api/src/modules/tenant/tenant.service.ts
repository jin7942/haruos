import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from './entities/tenant.entity';
import { CreateTenantRequestDto } from './dto/create-tenant.request.dto';
import { UpdateTenantRequestDto } from './dto/update-tenant.request.dto';
import { TenantResponseDto } from './dto/tenant.response.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../../common/exceptions/business.exception';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  /**
   * 테넌트 생성. slug 중복 검증 후 CREATING 상태로 생성.
   * 프로비저닝은 별도 모듈에서 처리.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param dto - 이름, slug, 리전, 설명
   * @returns 생성된 테넌트 정보
   * @throws DuplicateResourceException slug가 이미 존재하는 경우
   */
  async create(userId: string, dto: CreateTenantRequestDto): Promise<TenantResponseDto> {
    const existing = await this.tenantRepository.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new DuplicateResourceException('Tenant', dto.slug);
    }

    const tenant = TenantEntity.create(
      userId,
      dto.name,
      dto.slug,
      dto.region,
      dto.description,
    );
    await this.tenantRepository.save(tenant);
    return TenantResponseDto.from(tenant);
  }

  /**
   * 본인 소유 테넌트 목록 조회.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @returns 테넌트 목록
   */
  async findAll(userId: string): Promise<TenantResponseDto[]> {
    const tenants = await this.tenantRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return tenants.map(TenantResponseDto.from);
  }

  /**
   * 테넌트 상세 조회. 소유권 검증 포함.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @returns 테넌트 상세 정보
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async findOne(userId: string, tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.findOwnedTenant(userId, tenantId);
    return TenantResponseDto.from(tenant);
  }

  /**
   * 테넌트 정보 수정. 이름, 설명만 변경 가능.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @param dto - 수정할 필드
   * @returns 수정된 테넌트 정보
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async update(
    userId: string,
    tenantId: string,
    dto: UpdateTenantRequestDto,
  ): Promise<TenantResponseDto> {
    const tenant = await this.findOwnedTenant(userId, tenantId);

    if (dto.name !== undefined) tenant.name = dto.name;
    if (dto.description !== undefined) tenant.description = dto.description;

    await this.tenantRepository.save(tenant);
    return TenantResponseDto.from(tenant);
  }

  /**
   * 테넌트 삭제 (soft delete).
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  async remove(userId: string, tenantId: string): Promise<void> {
    const tenant = await this.findOwnedTenant(userId, tenantId);
    await this.tenantRepository.softRemove(tenant);
  }

  /**
   * 테넌트 일시 중지. ACTIVE -> SUSPENDED 상태 전이.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @returns 상태 변경된 테넌트
   * @throws InvalidStateTransitionException ACTIVE 상태가 아닌 경우
   */
  async suspend(userId: string, tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.findOwnedTenant(userId, tenantId);
    tenant.suspend();
    await this.tenantRepository.save(tenant);
    return TenantResponseDto.from(tenant);
  }

  /**
   * 테넌트 재개. SUSPENDED -> ACTIVE 상태 전이.
   *
   * @param userId - JWT에서 추출한 소유자 ID
   * @param tenantId - 테넌트 ID
   * @returns 상태 변경된 테넌트
   * @throws InvalidStateTransitionException SUSPENDED 상태가 아닌 경우
   */
  async resume(userId: string, tenantId: string): Promise<TenantResponseDto> {
    const tenant = await this.findOwnedTenant(userId, tenantId);
    tenant.resume();
    await this.tenantRepository.save(tenant);
    return TenantResponseDto.from(tenant);
  }

  /**
   * 소유권이 검증된 테넌트를 조회한다.
   *
   * @param userId - 소유자 ID
   * @param tenantId - 테넌트 ID
   * @throws ResourceNotFoundException 테넌트가 없거나 소유자가 아닌 경우
   */
  private async findOwnedTenant(userId: string, tenantId: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant || tenant.userId !== userId) {
      throw new ResourceNotFoundException('Tenant', tenantId);
    }
    return tenant;
  }
}
