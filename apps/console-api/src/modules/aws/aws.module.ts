import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsController } from './aws.controller';
import { AwsService } from './aws.service';
import { AwsCredentialPort } from './ports/aws-credential.port';
import { StsAdapter } from './adapters/sts.adapter';
import { AwsCredentialEntity } from './entities/aws-credential.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AwsCredentialEntity])],
  controllers: [AwsController],
  providers: [
    AwsService,
    { provide: AwsCredentialPort, useClass: StsAdapter },
  ],
  exports: [AwsService, AwsCredentialPort],
})
export class AwsModule {}
