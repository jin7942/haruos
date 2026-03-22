import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MetricCollectorPort } from './ports/metric-collector.port';
import { CostCollectorPort } from './ports/cost-collector.port';
import { CloudwatchAdapter } from './adapters/cloudwatch.adapter';
import { CostExplorerAdapter } from './adapters/cost-explorer.adapter';
import { MetricEntity } from './entities/metric.entity';
import { CostRecordEntity } from './entities/cost-record.entity';
import { AiUsageRecordEntity } from './entities/ai-usage-record.entity';
import { AlertConfigEntity } from './entities/alert-config.entity';
import { AlertHistoryEntity } from './entities/alert-history.entity';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MetricEntity, CostRecordEntity, AiUsageRecordEntity, AlertConfigEntity, AlertHistoryEntity]),
    TenantModule,
  ],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    { provide: MetricCollectorPort, useClass: CloudwatchAdapter },
    { provide: CostCollectorPort, useClass: CostExplorerAdapter },
  ],
  exports: [MonitoringService],
})
export class MonitoringModule {}
