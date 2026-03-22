import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FileAgentService } from './file-agent.service';
import { FileRecordResponseDto } from './dto/file-record.response.dto';
import { ValidationException } from '../../common/exceptions/business.exception';

/**
 * 파일 에이전트 컨트롤러.
 * 파일 업로드/조회/다운로드/삭제 API를 제공한다.
 */
@ApiTags('File Agent')
@ApiBearerAuth()
@Controller('agents/files')
export class FileController {
  constructor(private readonly fileAgentService: FileAgentService) {}

  /**
   * 파일을 업로드한다.
   *
   * @param req - HTTP 요청 (JWT 사용자 정보 포함)
   * @param file - Multer 파일 객체
   * @returns 생성된 파일 레코드
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '파일 업로드' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: FileRecordResponseDto })
  async uploadFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FileRecordResponseDto> {
    if (!file) {
      throw new ValidationException('File is required');
    }

    const userId = (req as any).user.sub;
    const record = await this.fileAgentService.uploadFile(
      userId,
      file.originalname,
      file.buffer,
      file.mimetype,
    );
    return FileRecordResponseDto.from(record);
  }

  /**
   * 사용자의 파일 목록을 조회한다.
   *
   * @param req - HTTP 요청
   * @returns 파일 레코드 목록
   */
  @Get()
  @ApiOperation({ summary: '파일 목록 조회' })
  @ApiResponse({ status: 200, type: [FileRecordResponseDto] })
  async getFiles(@Req() req: Request): Promise<FileRecordResponseDto[]> {
    const userId = (req as any).user.sub;
    const files = await this.fileAgentService.getFiles(userId);
    return files.map(FileRecordResponseDto.from);
  }

  /**
   * 파일의 다운로드 URL을 반환한다.
   *
   * @param id - 파일 레코드 ID
   * @returns Presigned URL
   */
  @Get(':id/url')
  @ApiOperation({ summary: '파일 다운로드 URL 조회' })
  @ApiResponse({ status: 200, schema: { type: 'object', properties: { url: { type: 'string' } } } })
  async getFileUrl(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.fileAgentService.getFileUrl(id);
    return { url };
  }

  /**
   * 파일을 삭제한다.
   *
   * @param id - 파일 레코드 ID
   */
  @Delete(':id')
  @ApiOperation({ summary: '파일 삭제' })
  @ApiResponse({ status: 200 })
  deleteFile(@Param('id') id: string): Promise<void> {
    return this.fileAgentService.deleteFile(id);
  }
}
