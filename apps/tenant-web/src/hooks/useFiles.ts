import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as fileApi from '../api/file.api';

/** 파일 목록을 조회하는 훅. */
export function useFiles() {
  return useQuery({
    queryKey: ['files'],
    queryFn: fileApi.getFiles,
  });
}

/** 파일을 업로드하는 훅. */
export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fileApi.uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

/** 파일을 삭제하는 훅. */
export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fileApi.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

/** 파일 자동 정리 훅. */
export function useOrganizeFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId?: string) => fileApi.organizeFiles(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['files', 'summary'] });
    },
  });
}

/** 카테고리별 파일 요약 훅. */
export function useFileCategorySummary() {
  return useQuery({
    queryKey: ['files', 'summary'],
    queryFn: fileApi.getCategorySummary,
  });
}
