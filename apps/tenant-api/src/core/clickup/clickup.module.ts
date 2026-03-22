import { Module } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { ClickUpApiPort } from './ports/clickup-api.port';
import { ClickUpApiAdapter } from './adapters/clickup-api.adapter';

@Module({
  providers: [
    ClickUpService,
    { provide: ClickUpApiPort, useClass: ClickUpApiAdapter },
  ],
  exports: [ClickUpService],
})
export class ClickUpModule {}
