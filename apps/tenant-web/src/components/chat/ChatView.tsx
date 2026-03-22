import { useCallback, useRef } from 'react';
import type { MessageResponse } from '@haruos/shared-types';
import { useMessages, useStreamMessage } from '../../hooks/useHaru';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatViewProps {
  conversationId?: string;
  onConversationCreated: (id: string) => void;
}

/**
 * 선택된 대화의 메시지 표시 + 입력.
 * SSE 스트리밍을 사용하여 AI 응답을 청크 단위로 점진적 렌더링한다.
 */
export function ChatView({ conversationId, onConversationCreated }: ChatViewProps) {
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const { send, isStreaming, streamingContent } = useStreamMessage();
  const pendingMessageRef = useRef('');

  const handleSend = useCallback(
    (text: string) => {
      pendingMessageRef.current = text;
      send(text, conversationId, onConversationCreated);
    },
    [conversationId, send, onConversationCreated],
  );

  // 메시지 목록 구성: 기존 메시지 + 전송 중 사용자 메시지 + 스트리밍 AI 응답
  const displayMessages: MessageResponse[] = [...messages];

  if (isStreaming) {
    displayMessages.push({
      id: 'pending-user',
      role: 'user',
      content: pendingMessageRef.current,
      metadata: null,
      createdAt: new Date().toISOString(),
    });

    if (streamingContent) {
      displayMessages.push({
        id: 'streaming-assistant',
        role: 'assistant',
        content: streamingContent,
        metadata: null,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={displayMessages}
        isLoading={!!conversationId && isLoading}
        isSending={isStreaming && !streamingContent}
      />
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
