import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as scheduleApi from '../api/schedule.api';

/** 일정 목록을 조회하는 훅. */
export function useSchedules(from?: string, to?: string) {
  return useQuery({
    queryKey: ['schedules', from, to],
    queryFn: () => scheduleApi.getSchedules(from, to),
  });
}

/** 일정을 생성하는 훅. */
export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scheduleApi.createSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

/** 일정을 수정하는 훅. */
export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; startDate?: string; endDate?: string; status?: string }) =>
      scheduleApi.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

/** 일정을 취소하는 훅. */
export function useCancelSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scheduleApi.cancelSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
