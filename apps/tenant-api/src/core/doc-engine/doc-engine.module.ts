import { Module } from '@nestjs/common';
import { DocEngineService } from './doc-engine.service';

@Module({
  providers: [DocEngineService],
  exports: [DocEngineService],
})
export class DocEngineModule {}
