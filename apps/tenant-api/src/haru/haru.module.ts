import { Module } from '@nestjs/common';
import { HaruController } from './haru.controller';
import { HaruGateway } from './haru.gateway';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { ContextModule } from './context/context.module';
import { BatchModule } from './batch/batch.module';
import { WatchdogModule } from './watchdog/watchdog.module';

@Module({
  imports: [OrchestratorModule, ContextModule, BatchModule, WatchdogModule],
  controllers: [HaruController],
  providers: [HaruGateway],
  exports: [HaruGateway],
})
export class HaruModule {}
