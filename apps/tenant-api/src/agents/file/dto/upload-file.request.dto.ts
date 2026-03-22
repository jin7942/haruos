import { ApiProperty } from '@nestjs/swagger';

/**
 * 파일 업로드 요청 DTO.
 * 실제로는 multipart/form-data로 전송되므로, 이 DTO는 Swagger 문서화용.
 */
export class UploadFileRequestDto {
  @ApiProperty({ type: 'string', format: 'binary', description: '업로드할 파일' })
  file: Express.Multer.File;
}
