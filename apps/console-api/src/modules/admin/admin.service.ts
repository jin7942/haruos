import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { TenantEntity } from '../tenant/entities/tenant.entity';
import { SubscriptionEntity } from '../billing/entities/subscription.entity';
import { AdminDashboardResponseDto } from './dto/admin-dashboard.response.dto';
import { AdminTenantResponseDto } from './dto/admin-tenant.response.dto';
import { AdminUserResponseDto } from './dto/admin-user.response.dto';
import { ResourceNotFoundException } from '../../common/exceptions/business.exception';

/**
 * 관리자 전용 서비스.
 * 전체 테넌트/사용자 조회 및 대시보드 집계를 담당한다.
 */
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
  ) {}

  /**
   * 관리자 대시보드 통계 조회.
   * 테넌트/사용자/구독 수를 집계한다.
   *
   * @returns 대시보드 통계
   */
  async getDashboard(): Promise<AdminDashboardResponseDto> {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalUsers,
      verifiedUsers,
      activeSubscriptions,
    ] = await Promise.all([
      this.tenantRepository.count(),
      this.tenantRepository.count({ where: { status: 'ACTIVE' } }),
      this.tenantRepository.count({ where: { status: 'CREATING' } }),
      this.tenantRepository.count({ where: { status: 'SUSPENDED' } }),
      this.userRepository.count(),
      this.userRepository.count({ where: { isEmailVerified: true } }),
      this.subscriptionRepository.count({ where: { status: 'ACTIVE' as any } }),
    ]);

    return AdminDashboardResponseDto.of({
      totalTenants,
      activeTenants,
      trialTenants,
      suspendedTenants,
      totalUsers,
      verifiedUsers,
      activeSubscriptions,
    });
  }

  /**
   * 전체 테넌트 목록 조회 (관리자용).
   * 소유자 구분 없이 모든 테넌트를 반환한다.
   *
   * @returns 전체 테넌트 목록
   */
  async getAllTenants(): Promise<AdminTenantResponseDto[]> {
    const tenants = await this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });
    return tenants.map(AdminTenantResponseDto.from);
  }

  /**
   * 관리자가 테넌트를 일시 중지한다.
   * 소유권 검증 없이 직접 상태 전이.
   *
   * @param tenantId - 테넌트 ID
   * @returns 상태 변경된 테넌트
   * @throws ResourceNotFoundException 테넌트가 존재하지 않는 경우
   */
  async suspendTenant(tenantId: string): Promise<AdminTenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new ResourceNotFoundException('Tenant', tenantId);
    }
    tenant.suspend();
    await this.tenantRepository.save(tenant);
    return AdminTenantResponseDto.from(tenant);
  }

  /**
   * 관리자가 테넌트를 재개한다.
   * 소유권 검증 없이 직접 상태 전이.
   *
   * @param tenantId - 테넌트 ID
   * @returns 상태 변경된 테넌트
   * @throws ResourceNotFoundException 테넌트가 존재하지 않는 경우
   */
  async resumeTenant(tenantId: string): Promise<AdminTenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new ResourceNotFoundException('Tenant', tenantId);
    }
    tenant.resume();
    await this.tenantRepository.save(tenant);
    return AdminTenantResponseDto.from(tenant);
  }

  /**
   * 전체 사용자 목록 조회 (관리자용).
   *
   * @returns 전체 사용자 목록
   */
  async getAllUsers(): Promise<AdminUserResponseDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map(AdminUserResponseDto.from);
  }
}
