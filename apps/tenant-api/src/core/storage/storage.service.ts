import { Injectable } from '@nestjs/common';
import { StoragePort } from './ports/storage.port';
import { FileResponseDto } from './dto/file.response.dto';

/**
 * 스토리지 서비스.
 * StoragePort를 통해 파일 저장소에 접근한다.
 */
@Injectable()
export class StorageService {
  constructor(private readonly storage: StoragePort) {}

  /**
   * 파일을 업로드한다.
   *
   * @param key - 저장 경로
   * @param body - 파일 바이너리
   * @param contentType - MIME 타입
   */
  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.storage.upload(key, body, contentType);
  }

  /**
   * 파일을 다운로드한다.
   *
   * @param key - 저장 경로
   * @returns 파일 바이너리
   */
  async download(key: string): Promise<Buffer> {
    return this.storage.download(key);
  }

  /**
   * 파일을 삭제한다.
   *
   * @param key - 저장 경로
   */
  async delete(key: string): Promise<void> {
    await this.storage.delete(key);
  }

  /**
   * Presigned URL을 생성하여 파일 정보를 반환한다.
   *
   * @param key - 저장 경로
   * @param expiresIn - URL 유효 시간 (초)
   * @returns 파일 정보 (key, url)
   */
  async getFileInfo(key: string, expiresIn?: number): Promise<FileResponseDto> {
    const url = await this.storage.getPresignedUrl(key, expiresIn);
    return FileResponseDto.from(key, url);
  }
}
