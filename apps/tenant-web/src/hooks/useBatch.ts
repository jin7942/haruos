import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as batchApi from '../api/batch.api';

/** 배치 작업 목록을 조회하는 훅. */
export function useBatchJobs() {
  return useQuery({
    queryKey: ['batchJobs'],
    queryFn: batchApi.getBatchJobs,
  });
}

/** 배치 작업을 수동 실행하는 훅. */
export function useTriggerBatchJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: batchApi.triggerBatchJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batchJobs'] });
    },
  });
}
