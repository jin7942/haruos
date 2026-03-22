import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'haruos'),
        password: config.get('DB_PASSWORD', 'haruos'),
        database: config.get('DB_DATABASE', 'haruos_tenant'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'change-me-in-production'),
        signOptions: {
          expiresIn: config.get('JWT_ACCESS_EXPIRY', '15m'),
        },
      }),
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
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
