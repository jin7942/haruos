import { useState, useCallback, useRef } from 'react';
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

/** Haru에게 메시지를 전송하는 훅 (일반 POST). */
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

/**
 * Haru에게 메시지를 SSE 스트리밍으로 전송하는 훅.
 * 청크 단위로 응답을 수신하여 점진적 렌더링을 지원한다.
 */
export function useStreamMessage() {
  const queryClient = useQueryClient();
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    (
      message: string,
      conversationId: string | undefined,
      onConversationCreated?: (id: string) => void,
    ) => {
      setIsStreaming(true);
      setStreamingContent('');

      abortRef.current = haruApi.streamChat(message, conversationId, {
        onMeta: (meta) => {
          if (!conversationId && meta.conversationId) {
            onConversationCreated?.(meta.conversationId);
          }
        },
        onChunk: (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
        onDone: (done) => {
          setIsStreaming(false);
          setStreamingContent('');
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['messages', done.conversationId] });
        },
        onError: () => {
          setIsStreaming(false);
          setStreamingContent('');
        },
      });
    },
    [queryClient],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  return { send, cancel, streamingContent, isStreaming };
}
