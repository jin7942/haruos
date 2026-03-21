import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';
import { DomainEntity } from './entities/domain.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DomainEntity])],
  controllers: [DomainController],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
