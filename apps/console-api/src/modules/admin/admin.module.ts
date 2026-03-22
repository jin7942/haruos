import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserEntity } from '../auth/entities/user.entity';
import { TenantEntity } from '../tenant/entities/tenant.entity';
import { SubscriptionEntity } from '../billing/entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, TenantEntity, SubscriptionEntity])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
