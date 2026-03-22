import { Controller, Post, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ClickUpService } from './clickup.service';
import { ClickUpSyncResponseDto } from './dto/clickup-sync.response.dto';

/**
 * ClickUp 동기화 컨트롤러.
 * 수동 ClickUp 동기화 API를 제공한다.
 */
@ApiTags('ClickUp')
@ApiBearerAuth()
@Controller('clickup')
export class ClickUpController {
  private readonly logger = new Logger(ClickUpController.name);

  constructor(private readonly clickUpService: ClickUpService) {}

  /**
   * ClickUp 데이터를 수동으로 동기화한다.
   * Space/List/Task를 가져와 로컬 데이터와 동기화한다.
   *
   * @returns 동기화 결과 (동기화된 Space/Task 수)
   */
  @Post('sync')
  @ApiOperation({ summary: 'ClickUp 수동 동기화' })
  @ApiResponse({ status: 201, type: ClickUpSyncResponseDto })
  async sync(): Promise<ClickUpSyncResponseDto> {
    this.logger.log('ClickUp 수동 동기화 시작');
    const result = await this.clickUpService.syncAll();
    this.logger.log(`ClickUp 동기화 완료: spaces=${result.syncedSpaces}, tasks=${result.syncedTasks}`);
    return result;
  }
}
