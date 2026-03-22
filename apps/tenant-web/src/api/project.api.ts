import type { ProjectSyncResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** ClickUp 프로젝트를 동기화한다. */
export function syncProjects(): Promise<ProjectSyncResponse[]> {
  return apiClient.post('/agents/project/sync').then((r) => r.data);
}

/**
 * ClickUp 태스크 목록을 조회한다.
 *
 * @param listId - ClickUp List ID
 */
export function getTasks(listId: string): Promise<unknown[]> {
  return apiClient.get('/agents/project/tasks', { params: { listId } }).then((r) => r.data);
}

/**
 * ClickUp 태스크를 생성한다.
 *
 * @param data - 태스크 생성 정보
 */
export function createTask(data: { listId: string; name: string; description?: string }): Promise<unknown> {
  return apiClient.post('/agents/project/tasks', data).then((r) => r.data);
}
