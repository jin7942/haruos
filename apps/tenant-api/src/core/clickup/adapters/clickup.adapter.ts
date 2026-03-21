import { Injectable } from '@nestjs/common';
import { ClickUpPort } from '../ports/clickup.port';

@Injectable()
export class ClickUpAdapter implements ClickUpPort {
  async createSpace(name: string): Promise<string> {
    throw new Error('Not implemented');
  }

  async createTask(spaceId: string, data: Record<string, unknown>): Promise<string> {
    throw new Error('Not implemented');
  }

  async syncTasks(spaceId: string): Promise<void> {
    throw new Error('Not implemented');
  }

  getWebhookPayload(payload: Record<string, unknown>): Record<string, unknown> {
    throw new Error('Not implemented');
  }
}
