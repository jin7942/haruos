import { Module } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { ClickUpPort } from './ports/clickup.port';
import { ClickUpAdapter } from './adapters/clickup.adapter';

@Module({
  providers: [
    ClickUpService,
    { provide: ClickUpPort, useClass: ClickUpAdapter },
  ],
  exports: [ClickUpService],
})
export class ClickUpModule {}
