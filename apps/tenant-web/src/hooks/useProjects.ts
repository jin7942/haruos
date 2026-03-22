import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as projectApi from '../api/project.api';

/** 프로젝트 동기화를 실행하는 훅. */
export function useSyncProjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectApi.syncProjects,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
