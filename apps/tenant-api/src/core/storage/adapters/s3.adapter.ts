import { Injectable } from '@nestjs/common';
import { StoragePort } from '../ports/storage.port';

@Injectable()
export class S3Adapter implements StoragePort {
  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async download(key: string): Promise<Buffer> {
    throw new Error('Not implemented');
  }

  async delete(key: string): Promise<void> {
    throw new Error('Not implemented');
  }

  async getPresignedUrl(key: string, expiresIn?: number): Promise<string> {
    throw new Error('Not implemented');
  }
}
