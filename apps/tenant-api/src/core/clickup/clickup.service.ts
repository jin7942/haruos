import { Injectable } from '@nestjs/common';
import { ClickUpPort } from './ports/clickup.port';

@Injectable()
export class ClickUpService {
  constructor(private readonly clickUp: ClickUpPort) {}
}
