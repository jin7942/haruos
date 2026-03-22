import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConversationList } from '../components/chat/ConversationList';
import { ChatView } from '../components/chat/ChatView';

/** Haru 대화 페이지. 좌측 대화 목록 + 우측 채팅 영역. */
export function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const [showList, setShowList] = useState(true);

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/chat/${id}`);
      // 모바일에서 대화 선택 시 목록 숨김
      setShowList(false);
    },
    [navigate],
  );

  const handleNewChat = useCallback(() => {
    navigate('/chat');
    setShowList(false);
  }, [navigate]);

  const handleConversationCreated = useCallback(
    (id: string) => {
      navigate(`/chat/${id}`, { replace: true });
    },
    [navigate],
  );

  return (
    <div className="flex h-full">
      {/* 대화 목록 (데스크톱: 항상 표시, 모바일: 토글) */}
      <div
        className={`w-72 shrink-0 ${
          showList ? 'block' : 'hidden'
        } md:block`}
      >
        <ConversationList
          selectedId={conversationId}
          onSelect={handleSelect}
          onNewChat={handleNewChat}
        />
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 min-w-0">
        {/* 모바일: 대화 목록으로 돌아가기 버튼 */}
        {!showList && (
          <div className="md:hidden border-b border-gray-200 px-3 py-2">
            <button
              onClick={() => setShowList(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← 대화 목록
            </button>
          </div>
        )}
        <ChatView
          conversationId={conversationId}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
}
