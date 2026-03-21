import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { EmailVerificationEntity } from './entities/email-verification.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { MailSenderPort } from './ports/mail-sender.port';
import { ConsoleMailAdapter } from './adapters/console-mail.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, EmailVerificationEntity, RefreshTokenEntity]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: MailSenderPort, useClass: ConsoleMailAdapter },
  ],
  exports: [AuthService],
})
export class AuthModule {}
