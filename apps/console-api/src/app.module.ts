import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { AwsModule } from './modules/aws/aws.module';
import { ProvisionerModule } from './modules/provisioner/provisioner.module';
import { DomainModule } from './modules/domain/domain.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { BillingModule } from './modules/billing/billing.module';

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
      database: process.env.DB_DATABASE || 'haruos_console',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
    }),
    AuthModule,
    TenantModule,
    AwsModule,
    ProvisionerModule,
    DomainModule,
    MonitoringModule,
    BillingModule,
  ],
})
export class AppModule {}
