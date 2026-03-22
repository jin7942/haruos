import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectAgentService } from './project-agent.service';
import { ProjectSyncEntity } from './entities/project-sync.entity';
import { ClickUpModule } from '../../core/clickup/clickup.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectSyncEntity]),
    ClickUpModule,
  ],
  controllers: [ProjectController],
  providers: [ProjectAgentService],
  exports: [ProjectAgentService],
})
export class ProjectModule {}
