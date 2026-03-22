import { Injectable, Logger } from '@nestjs/common';
import { StoragePort } from '../ports/storage.port';

/**
 * S3 스토리지 어댑터 (stub).
 * 프로덕션에서는 AWS SDK를 사용하여 S3 API를 호출한다.
 */
@Injectable()
export class S3Adapter extends StoragePort {
  private readonly logger = new Logger(S3Adapter.name);

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    this.logger.warn(`[Stub] S3 upload: key=${key}, size=${body.length}, type=${contentType}`);
  }

  async download(key: string): Promise<Buffer> {
    this.logger.warn(`[Stub] S3 download: key=${key}`);
    return Buffer.from(`[Stub] Content of ${key}`);
  }

  async delete(key: string): Promise<void> {
    this.logger.warn(`[Stub] S3 delete: key=${key}`);
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    this.logger.warn(`[Stub] S3 getPresignedUrl: key=${key}, expiresIn=${expiresIn}`);
    return `https://stub-bucket.s3.amazonaws.com/${key}?expires=${expiresIn}`;
  }
}
