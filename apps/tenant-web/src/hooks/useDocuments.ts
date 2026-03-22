import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as documentApi from '../api/document.api';

/** 문서 목록을 조회하는 훅. */
export function useDocuments(type?: string) {
  return useQuery({
    queryKey: ['documents', type],
    queryFn: () => documentApi.getDocuments(type),
  });
}

/** 문서를 생성하는 훅. */
export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: documentApi.createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/** 문서를 수정하는 훅. */
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; content?: string }) =>
      documentApi.updateDocument(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

/** 문서 AI 요약 훅. */
export function useSummarizeDocument() {
  return useMutation({
    mutationFn: documentApi.summarizeDocument,
  });
}

/** Action Item 추출 훅. */
export function useExtractActionItems() {
  return useMutation({
    mutationFn: documentApi.extractActionItems,
  });
}
