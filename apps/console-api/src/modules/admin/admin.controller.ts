import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminDashboardResponseDto } from './dto/admin-dashboard.response.dto';
import { AdminTenantResponseDto } from './dto/admin-tenant.response.dto';
import { AdminUserResponseDto } from './dto/admin-user.response.dto';

/**
 * 관리자 전용 API.
 * AdminGuard로 role === 'ADMIN' 체크.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '관리자 대시보드 통계' })
  @ApiResponse({ status: 200, type: AdminDashboardResponseDto })
  getDashboard(): Promise<AdminDashboardResponseDto> {
    return this.adminService.getDashboard();
  }

  @Get('tenants')
  @ApiOperation({ summary: '전체 테넌트 목록 (관리자)' })
  @ApiResponse({ status: 200, type: [AdminTenantResponseDto] })
  getAllTenants(): Promise<AdminTenantResponseDto[]> {
    return this.adminService.getAllTenants();
  }

  @Post('tenants/:id/suspend')
  @ApiOperation({ summary: '테넌트 일시 중지 (관리자)' })
  @ApiResponse({ status: 201, type: AdminTenantResponseDto })
  suspendTenant(@Param('id') id: string): Promise<AdminTenantResponseDto> {
    return this.adminService.suspendTenant(id);
  }

  @Post('tenants/:id/resume')
  @ApiOperation({ summary: '테넌트 재개 (관리자)' })
  @ApiResponse({ status: 201, type: AdminTenantResponseDto })
  resumeTenant(@Param('id') id: string): Promise<AdminTenantResponseDto> {
    return this.adminService.resumeTenant(id);
  }

  @Get('users')
  @ApiOperation({ summary: '전체 사용자 목록 (관리자)' })
  @ApiResponse({ status: 200, type: [AdminUserResponseDto] })
  getAllUsers(): Promise<AdminUserResponseDto[]> {
    return this.adminService.getAllUsers();
  }
}
