/**
 * ClickUp 연동 포트.
 * 프로젝트 관리 도구와의 동기화 담당.
 */
export abstract class ClickUpPort {
  abstract createSpace(name: string): Promise<string>;
  abstract createTask(spaceId: string, data: Record<string, unknown>): Promise<string>;
  abstract syncTasks(spaceId: string): Promise<void>;
  abstract getWebhookPayload(payload: Record<string, unknown>): Record<string, unknown>;
}
