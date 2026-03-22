import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as haruApi from '../api/haru.api';

/** 대화 목록을 조회하는 훅. */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: haruApi.getConversations,
  });
}

/** 특정 대화의 메시지를 조회하는 훅. */
export function useMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => haruApi.getMessages(conversationId!),
    enabled: !!conversationId,
  });
}

/** Haru에게 메시지를 전송하는 훅. */
export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ message, conversationId }: { message: string; conversationId?: string }) =>
      haruApi.sendMessage(message, conversationId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
    },
  });
}
