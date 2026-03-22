import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AwsModule } from './modules/aws/aws.module';
import { ProvisionerModule } from './modules/provisioner/provisioner.module';
import { DomainModule } from './modules/domain/domain.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { BillingModule } from './modules/billing/billing.module';
import { CommonCodeModule } from './modules/common-code/common-code.module';
import { BackupModule } from './modules/backup/backup.module';
import { AdminModule } from './modules/admin/admin.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        DB_HOST: Joi.string().default('localhost'),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().default('haruos'),
        DB_PASSWORD: Joi.string().default('haruos'),
        DB_DATABASE: Joi.string().default('haruos_console'),
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
        database: config.get('DB_DATABASE', 'haruos_console'),
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
    AuthModule,
    CommonCodeModule,
    TenantModule,
    AwsModule,
    ProvisionerModule,
    DomainModule,
    MonitoringModule,
    BillingModule,
    BackupModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
