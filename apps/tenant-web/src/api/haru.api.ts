import type {
  ChatResponse,
  ConversationResponse,
  MessageResponse,
  ChatStreamMeta,
  ChatStreamDone,
} from '@haruos/shared-types';
import { apiClient } from './client';
import { getAccessToken } from './client';

/**
 * Haru에게 메시지를 전송한다.
 *
 * @param message - 사용자 메시지
 * @param conversationId - 대화 ID (없으면 새 대화 생성)
 * @returns AI 응답
 */
export function sendMessage(message: string, conversationId?: string): Promise<ChatResponse> {
  return apiClient.post('/haru/chat', { message, conversationId }).then((r) => r.data);
}

/** SSE 스트리밍 이벤트 콜백. */
export interface StreamChatCallbacks {
  onMeta?: (meta: ChatStreamMeta) => void;
  onChunk?: (chunk: string) => void;
  onDone?: (done: ChatStreamDone) => void;
  onError?: (error: { message: string }) => void;
}

/**
 * Haru에게 메시지를 전송하고 SSE 스트리밍으로 응답을 받는다.
 * fetch + ReadableStream을 사용하여 SSE를 파싱한다.
 *
 * @param message - 사용자 메시지
 * @param conversationId - 대화 ID (없으면 새 대화 생성)
 * @param callbacks - 이벤트별 콜백
 * @returns AbortController (스트림 취소용)
 */
export function streamChat(
  message: string,
  conversationId: string | undefined,
  callbacks: StreamChatCallbacks,
): AbortController {
  const controller = new AbortController();
  const token = getAccessToken();

  fetch('/api/haru/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversationId }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        callbacks.onError?.({ message: `HTTP ${response.status}` });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError?.({ message: 'ReadableStream not supported' });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = 'message';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            switch (currentEvent) {
              case 'meta':
                callbacks.onMeta?.(JSON.parse(data));
                break;
              case 'chunk':
                callbacks.onChunk?.(data);
                break;
              case 'done':
                callbacks.onDone?.(JSON.parse(data));
                break;
              case 'error':
                callbacks.onError?.(JSON.parse(data));
                break;
            }
            currentEvent = 'message';
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        callbacks.onError?.({ message: err.message });
      }
    });

  return controller;
}

/** 대화 목록을 조회한다. */
export function getConversations(): Promise<ConversationResponse[]> {
  return apiClient.get('/haru/conversations').then((r) => r.data);
}

/**
 * 특정 대화의 메시지 목록을 조회한다.
 *
 * @param conversationId - 대화 ID
 */
export function getMessages(conversationId: string): Promise<MessageResponse[]> {
  return apiClient.get(`/haru/conversations/${conversationId}/messages`).then((r) => r.data);
}
