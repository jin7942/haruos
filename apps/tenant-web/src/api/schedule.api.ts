import type { ScheduleResponse } from '@haruos/shared-types';
import { apiClient } from './client';

/** 일정 목록을 조회한다. */
export function getSchedules(from?: string, to?: string): Promise<ScheduleResponse[]> {
  return apiClient.get('/agents/schedules', { params: { from, to } }).then((r) => r.data);
}

/** 일정을 생성한다. */
export function createSchedule(data: {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
}): Promise<ScheduleResponse> {
  return apiClient.post('/agents/schedules', data).then((r) => r.data);
}

/** 일정을 수정한다. */
export function updateSchedule(
  id: string,
  data: { title?: string; description?: string; startDate?: string; endDate?: string; status?: string },
): Promise<ScheduleResponse> {
  return apiClient.patch(`/agents/schedules/${id}`, data).then((r) => r.data);
}

/** 일정을 취소한다. */
export function cancelSchedule(id: string): Promise<void> {
  return apiClient.delete(`/agents/schedules/${id}`).then(() => undefined);
}
