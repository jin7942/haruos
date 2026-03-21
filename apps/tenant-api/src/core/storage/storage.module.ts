import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { StoragePort } from './ports/storage.port';
import { S3Adapter } from './adapters/s3.adapter';

@Module({
  providers: [
    StorageService,
    { provide: StoragePort, useClass: S3Adapter },
  ],
  exports: [StorageService],
})
export class StorageModule {}
