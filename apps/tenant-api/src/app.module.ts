import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Core modules
import { AuthModule } from './core/auth/auth.module';
import { AiGatewayModule } from './core/ai-gateway/ai-gateway.module';
import { StorageModule } from './core/storage/storage.module';
import { DocEngineModule } from './core/doc-engine/doc-engine.module';
import { ClickUpModule } from './core/clickup/clickup.module';

// Haru module
import { HaruModule } from './haru/haru.module';

// Agent modules
import { ProjectModule } from './agents/project/project.module';
import { ScheduleModule } from './agents/schedule/schedule.module';
import { DocumentModule } from './agents/document/document.module';
import { KnowledgeModule } from './agents/knowledge/knowledge.module';
import { FileModule } from './agents/file/file.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'haruos',
      password: process.env.DB_PASSWORD || 'haruos',
      database: process.env.DB_DATABASE || 'haruos_tenant',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
    }),

    // Core
    AuthModule,
    AiGatewayModule,
    StorageModule,
    DocEngineModule,
    ClickUpModule,

    // Haru
    HaruModule,

    // Agents
    ProjectModule,
    ScheduleModule,
    DocumentModule,
    KnowledgeModule,
    FileModule,
  ],
})
export class AppModule {}
