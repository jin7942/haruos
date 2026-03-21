import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { CreateTenantRequestDto } from './dto/create-tenant.request.dto';

@ApiTags('Tenant')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  create(@Body() dto: CreateTenantRequestDto) {}

  @Get()
  findAll() {}

  @Get(':id')
  findOne(@Param('id') id: string) {}

  @Patch(':id')
  update(@Param('id') id: string) {}

  @Delete(':id')
  remove(@Param('id') id: string) {}

  @Post(':id/suspend')
  suspend(@Param('id') id: string) {}

  @Post(':id/resume')
  resume(@Param('id') id: string) {}
}
