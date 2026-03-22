import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TenantService } from './tenant.service';
import { CreateTenantRequestDto } from './dto/create-tenant.request.dto';
import { UpdateTenantRequestDto } from './dto/update-tenant.request.dto';
import { ScaleTenantRequestDto } from './dto/scale-tenant.request.dto';
import { TenantResponseDto } from './dto/tenant.response.dto';

@ApiTags('Tenant')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: '프로젝트 생성' })
  @ApiResponse({ status: 201, type: TenantResponseDto })
  create(@Req() req: Request, @Body() dto: CreateTenantRequestDto): Promise<TenantResponseDto> {
    return this.tenantService.create((req as any).user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '내 프로젝트 목록' })
  @ApiResponse({ status: 200, type: [TenantResponseDto] })
  findAll(@Req() req: Request): Promise<TenantResponseDto[]> {
    return this.tenantService.findAll((req as any).user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '프로젝트 상세 조회' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  findOne(@Req() req: Request, @Param('id') id: string): Promise<TenantResponseDto> {
    return this.tenantService.findOne((req as any).user.sub, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '프로젝트 수정' })
  @ApiResponse({ status: 200, type: TenantResponseDto })
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateTenantRequestDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.update((req as any).user.sub, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '프로젝트 삭제' })
  @ApiResponse({ status: 200 })
  remove(@Req() req: Request, @Param('id') id: string): Promise<void> {
    return this.tenantService.remove((req as any).user.sub, id);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: '프로젝트 일시 중지' })
  @ApiResponse({ status: 201, type: TenantResponseDto })
  suspend(@Req() req: Request, @Param('id') id: string): Promise<TenantResponseDto> {
    return this.tenantService.suspend((req as any).user.sub, id);
  }

  @Post(':id/resume')
  @ApiOperation({ summary: '프로젝트 재개' })
  @ApiResponse({ status: 201, type: TenantResponseDto })
  resume(@Req() req: Request, @Param('id') id: string): Promise<TenantResponseDto> {
    return this.tenantService.resume((req as any).user.sub, id);
  }

  @Post(':id/scale')
  @ApiOperation({ summary: '프로젝트 사양 변경 (플랜 타입 변경)' })
  @ApiResponse({ status: 201, type: TenantResponseDto })
  scale(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ScaleTenantRequestDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.scale((req as any).user.sub, id, dto.planType);
  }

  @Post(':id/update')
  @ApiOperation({ summary: '앱 버전 업데이트 (롤링 업데이트 트리거)' })
  @ApiResponse({ status: 201, type: TenantResponseDto })
  triggerUpdate(@Req() req: Request, @Param('id') id: string): Promise<TenantResponseDto> {
    return this.tenantService.triggerUpdate((req as any).user.sub, id);
  }
}
