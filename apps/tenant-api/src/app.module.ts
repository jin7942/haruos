import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import * as Joi from 'joi';

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
import { StatsModule } from './modules/stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().default('haruos'),
        DB_PASSWORD: Joi.string().default('haruos'),
        DB_DATABASE: Joi.string().default('haruos_tenant'),
        JWT_SECRET: Joi.string().default('change-me-in-production'),
        JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
      }),
      validationOptions: { allowUnknown: true, abortEarly: false },
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

    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

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
    StatsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
