import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './file.controller';
import { FileAgentService } from './file-agent.service';
import { FileRecordEntity } from './entities/file-record.entity';
import { StorageModule } from '../../core/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileRecordEntity]),
    StorageModule,
  ],
  controllers: [FileController],
  providers: [FileAgentService],
  exports: [FileAgentService],
})
export class FileModule {}
