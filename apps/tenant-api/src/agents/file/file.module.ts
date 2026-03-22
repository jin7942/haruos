import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './file.controller';
import { FileAgentService } from './file-agent.service';
import { NasScannerService } from './nas-scanner.service';
import { NasOrganizerService } from './nas-organizer.service';
import { NasWatcherService } from './nas-watcher.service';
import { File } from './entities/file.entity';
import { StorageModule } from '../../core/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    StorageModule,
  ],
  controllers: [FileController],
  providers: [FileAgentService, NasScannerService, NasOrganizerService, NasWatcherService],
  exports: [FileAgentService, NasScannerService, NasOrganizerService],
})
export class FileModule {}
