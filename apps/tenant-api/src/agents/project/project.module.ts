import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectAgentService } from './project-agent.service';
import { ProjectSyncEntity } from './entities/project-sync.entity';
import { ClickUpModule } from '../../core/clickup/clickup.module';
import { AiGatewayModule } from '../../core/ai-gateway/ai-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectSyncEntity]),
    ClickUpModule,
    AiGatewayModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectAgentService],
  exports: [ProjectAgentService],
})
export class ProjectModule {}
