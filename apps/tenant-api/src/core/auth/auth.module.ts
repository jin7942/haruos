import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantUserEntity } from './entities/tenant-user.entity';
import { OtpEntity } from './entities/otp.entity';
import { OtpSenderPort } from './ports/otp-sender.port';
import { ConsoleOtpAdapter } from './adapters/console-otp.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantUserEntity, OtpEntity]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: OtpSenderPort, useClass: ConsoleOtpAdapter },
  ],
  exports: [AuthService],
})
export class AuthModule {}
