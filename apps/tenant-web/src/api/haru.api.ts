import type { ChatResponse, ConversationResponse, MessageResponse } from '@haruos/shared-types';
import { apiClient } from './client';

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
