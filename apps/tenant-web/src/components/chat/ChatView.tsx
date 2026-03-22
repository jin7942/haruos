import { useCallback } from 'react';
import type { MessageResponse } from '@haruos/shared-types';
import { useMessages, useSendMessage } from '../../hooks/useHaru';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatViewProps {
  conversationId?: string;
  onConversationCreated: (id: string) => void;
}

/** 선택된 대화의 메시지 표시 + 입력. 새 대화 자동 생성 지원. */
export function ChatView({ conversationId, onConversationCreated }: ChatViewProps) {
  const { data: messages = [], isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();

  const handleSend = useCallback(
    (text: string) => {
      sendMessage.mutate(
        { message: text, conversationId },
        {
          onSuccess: (data) => {
            if (!conversationId) {
              onConversationCreated(data.conversationId);
            }
          },
        },
      );
    },
    [conversationId, sendMessage, onConversationCreated],
  );

  // 전송 중인 사용자 메시지를 임시로 표시
  const displayMessages: MessageResponse[] = sendMessage.isPending
    ? [
        ...messages,
        {
          id: 'pending-user',
          role: 'user',
          content: (sendMessage.variables as { message: string })?.message ?? '',
          metadata: null,
          createdAt: new Date().toISOString(),
        },
      ]
    : messages;

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={displayMessages}
        isLoading={!!conversationId && isLoading}
        isSending={sendMessage.isPending}
      />
      <MessageInput onSend={handleSend} disabled={sendMessage.isPending} />
    </div>
  );
}
