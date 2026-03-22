import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommonCodeService } from './common-code.service';
import { CreateCodeGroupRequestDto } from './dto/create-code-group.request.dto';
import { CreateCodeRequestDto } from './dto/create-code.request.dto';
import { CodeGroupResponseDto } from './dto/code-group.response.dto';
import { CodeResponseDto } from './dto/code.response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Common Code')
@Controller('codes')
export class CommonCodeController {
  constructor(private readonly commonCodeService: CommonCodeService) {}

  @Public()
  @Get('groups')
  @ApiOperation({ summary: '코드 그룹 전체 조회' })
  @ApiResponse({ status: 200, type: [CodeGroupResponseDto] })
  findAllGroups(): Promise<CodeGroupResponseDto[]> {
    return this.commonCodeService.findAllGroups();
  }

  @Public()
  @Get('groups/:groupCode')
  @ApiOperation({ summary: '코드 그룹 + 하위 코드 조회' })
  @ApiResponse({ status: 200, type: CodeGroupResponseDto })
  findGroupByCode(@Param('groupCode') groupCode: string): Promise<CodeGroupResponseDto> {
    return this.commonCodeService.findGroupByCode(groupCode);
  }

  @Post('groups')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '코드 그룹 생성 (관리자 전용)' })
  @ApiResponse({ status: 201, type: CodeGroupResponseDto })
  createGroup(@Body() dto: CreateCodeGroupRequestDto): Promise<CodeGroupResponseDto> {
    return this.commonCodeService.createGroup(dto);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '코드 생성 (관리자 전용)' })
  @ApiResponse({ status: 201, type: CodeResponseDto })
  createCode(@Body() dto: CreateCodeRequestDto): Promise<CodeResponseDto> {
    return this.commonCodeService.createCode(dto);
  }
}
