import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { CommonCodeController } from './common-code.controller';
import { CommonCodeService } from './common-code.service';
import { CodeGroupEntity } from './entities/code-group.entity';
import { CodeEntity } from './entities/code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CodeGroupEntity, CodeEntity]),
    CacheModule.register({ ttl: 1800000 }),
  ],
  controllers: [CommonCodeController],
  providers: [CommonCodeService],
  exports: [CommonCodeService],
})
export class CommonCodeModule {}
