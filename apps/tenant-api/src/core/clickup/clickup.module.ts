import { Module } from '@nestjs/common';
import { ClickUpController } from './clickup.controller';
import { ClickUpService } from './clickup.service';
import { ClickUpApiPort } from './ports/clickup-api.port';
import { ClickUpApiAdapter } from './adapters/clickup-api.adapter';

@Module({
  controllers: [ClickUpController],
  providers: [
    ClickUpService,
    { provide: ClickUpApiPort, useClass: ClickUpApiAdapter },
  ],
  exports: [ClickUpService],
})
export class ClickUpModule {}
